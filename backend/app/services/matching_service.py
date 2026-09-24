import logging
from typing import Any, Dict, List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.explanation_generator import explanation_generator
from app.matching.gap_analyzer import analyze_gaps
from app.matching.scorer import (
    calculate_evidence_score,
    calculate_experience_score,
    calculate_match_score,
)
from app.matching.semantic import cosine_similarity
from app.matching.skill_matcher import evaluate_skill_match
from app.models.match import Match, MatchSkill
from app.repositories.employees import EmployeeRepository
from app.repositories.initiatives import InitiativeRepository
from app.repositories.matches import MatchRepository

logger = logging.getLogger(__name__)


class MatchingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.emp_repo = EmployeeRepository(db)
        self.init_repo = InitiativeRepository(db)
        self.match_repo = MatchRepository(db)

    async def compute_matches_for_initiative(
        self,
        initiative_id: UUID,
        limit: int = 10,
    ) -> List[Match]:
        initiative = await self.init_repo.get_by_id(initiative_id)
        if not initiative:
            raise ValueError("Initiative not found")

        employees = await self.emp_repo.get_all_for_matching()
        required_skills = initiative.required_skills

        # Delete old matches
        await self.match_repo.delete_for_initiative(initiative_id)

        computed_matches = []

        for emp in employees:
            emp_skills_map = {es.skill.name.lower().strip(): es for es in emp.skills if es.skill}
            
            # 1. Skill Score Calculation
            total_skill_weight = 0.0
            weighted_skill_sum = 0.0
            evaluated_skill_items = []
            match_skills_to_create = []

            for req in required_skills:
                weight = req.weight or 1.0
                total_skill_weight += weight
                match_type, skill_score, emp_prof = evaluate_skill_match(req, emp_skills_map)
                weighted_skill_sum += skill_score * weight

                evaluated_skill_items.append({
                    "skill_name": req.skill.name if req.skill else "",
                    "match_type": match_type,
                    "importance": req.importance,
                    "score": skill_score,
                })

                match_skills_to_create.append({
                    "skill_id": req.skill_id,
                    "required_proficiency": req.min_proficiency,
                    "employee_proficiency": emp_prof,
                    "match_type": match_type,
                    "score": skill_score,
                })

            skill_score = round(weighted_skill_sum / total_skill_weight, 2) if total_skill_weight > 0 else 0.0

            # 2. Semantic Score
            semantic_score = cosine_similarity(initiative.embedding, emp.embedding)

            # 3. Experience Score
            experience_score = calculate_experience_score(emp.years_experience, target_years=5.0)

            # 4. Evidence Score
            verified_count = sum(1 for es in emp.skills if es.verified)
            evidence_score = calculate_evidence_score(
                verified_count=verified_count,
                total_skills=len(emp.skills),
                project_count=len(emp.projects),
            )

            # Overall Score
            overall_score = calculate_match_score(
                skill_score=skill_score,
                semantic_score=semantic_score,
                experience_score=experience_score,
                evidence_score=evidence_score,
            )

            # Gap analysis
            gaps = analyze_gaps(required_skills, evaluated_skill_items)

            evidence_items = [
                {"type": "project", "name": p.project.name, "role": p.role, "tech": p.technologies_used}
                for p in emp.projects if p.project
            ]

            match_obj = Match(
                initiative_id=initiative.id,
                employee_id=emp.id,
                overall_score=overall_score,
                skill_score=skill_score,
                semantic_score=semantic_score,
                experience_score=experience_score,
                evidence_score=evidence_score,
                gap_summary=gaps,
                evidence_items=evidence_items,
            )

            for ms in match_skills_to_create:
                match_skill = MatchSkill(
                    skill_id=ms["skill_id"],
                    required_proficiency=ms["required_proficiency"],
                    employee_proficiency=ms["employee_proficiency"],
                    match_type=ms["match_type"],
                    score=ms["score"],
                )
                match_obj.match_skills.append(match_skill)

            computed_matches.append(match_obj)

        # Sort by score descending and take top N
        computed_matches.sort(key=lambda m: m.overall_score, reverse=True)
        top_matches = computed_matches[:limit]

        # Generate LLM explanations for top 3 candidates
        for idx, match in enumerate(top_matches):
            match.rank = idx + 1
            if idx < 3:
                emp = next(e for e in employees if e.id == match.employee_id)
                explanation = await explanation_generator.generate_explanation(
                    employee_name=emp.name,
                    employee_title=emp.title,
                    initiative_title=initiative.title,
                    overall_score=match.overall_score,
                    matched_skills=match.gap_summary.get("covered_skills", []),
                    gap_summary=match.gap_summary,
                    project_count=len(emp.projects),
                )
                match.explanation = explanation
            else:
                match.explanation = "Candidate scored high in core direct capabilities with validated project track record."

        await self.match_repo.save_matches(top_matches)
        return await self.match_repo.get_matches_for_initiative(initiative_id, limit=limit)
