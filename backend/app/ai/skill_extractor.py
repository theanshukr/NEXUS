import json
import logging
from typing import Any, Dict
from app.ai.client import ai_client
from app.ai.prompts import SKILL_EXTRACTION_SYSTEM_PROMPT
from app.schemas.initiative import AnalyzeInitiativeResponse, ExtractedSkill

logger = logging.getLogger(__name__)


class SkillExtractor:
    async def extract_skills_from_text(self, description: str, business_unit: str = None) -> AnalyzeInitiativeResponse:
        user_prompt = f"Initiative Description:\n{description}"
        if business_unit:
            user_prompt += f"\nBusiness Unit: {business_unit}"

        response_text = await ai_client.generate_chat_completion(
            system_prompt=SKILL_EXTRACTION_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            json_mode=True,
        )

        try:
            data = json.loads(response_text)
            suggested_skills = [
                ExtractedSkill(
                    name=s.get("name", "Skill"),
                    category=s.get("category", "General"),
                    min_proficiency=s.get("min_proficiency", 3),
                    importance=s.get("importance", "Required"),
                    weight=s.get("weight", 1.0),
                    rationale=s.get("rationale"),
                )
                for s in data.get("suggested_skills", [])
            ]

            return AnalyzeInitiativeResponse(
                title=data.get("title", "Strategic Initiative"),
                summary=data.get("summary", description[:200]),
                complexity_level=data.get("complexity_level", "Medium"),
                estimated_roles=data.get("estimated_roles", []),
                suggested_skills=suggested_skills,
            )
        except Exception as e:
            logger.error(f"Failed to parse skill extraction response: {e}")
            # Fallback
            return AnalyzeInitiativeResponse(
                title="Strategic Initiative",
                summary=description[:200],
                complexity_level="Medium",
                estimated_roles=["Full-Stack Engineer"],
                suggested_skills=[
                    ExtractedSkill(name="Python", category="Languages", min_proficiency=3, importance="Required"),
                    ExtractedSkill(name="React", category="Frameworks", min_proficiency=3, importance="Required"),
                ],
            )


skill_extractor = SkillExtractor()
