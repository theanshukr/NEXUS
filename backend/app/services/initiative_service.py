from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import ai_client
from app.ai.skill_extractor import skill_extractor
from app.models.initiative import Initiative, InitiativeSkill
from app.repositories.initiatives import InitiativeRepository
from app.repositories.skills import SkillRepository
from app.schemas.initiative import AnalyzeInitiativeRequest, AnalyzeInitiativeResponse, InitiativeCreate


class InitiativeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = InitiativeRepository(db)
        self.skill_repo = SkillRepository(db)

    async def analyze_requirements(self, req: AnalyzeInitiativeRequest) -> AnalyzeInitiativeResponse:
        return await skill_extractor.extract_skills_from_text(
            description=req.description,
            business_unit=req.business_unit,
        )

    async def create_initiative_with_skills(
        self,
        initiative_in: InitiativeCreate,
        skills_data: List[dict],
        created_by_id: Optional[UUID] = None,
    ) -> Initiative:
        initiative = await self.repo.create(initiative_in, created_by_id=created_by_id)

        # Generate embedding for initiative description
        embedding = await ai_client.generate_embedding(f"{initiative.title}: {initiative.description}")
        initiative.embedding = embedding

        # Create or link required skills
        for item in skills_data:
            skill = await self.skill_repo.get_or_create(
                name=item["name"],
                category=item.get("category", "General"),
            )
            init_skill = InitiativeSkill(
                initiative_id=initiative.id,
                skill_id=skill.id,
                min_proficiency=item.get("min_proficiency", 3),
                importance=item.get("importance", "Required"),
                weight=item.get("weight", 1.0),
                source=item.get("source", "ai_extracted"),
            )
            self.db.add(init_skill)

        await self.db.commit()
        await self.db.refresh(initiative)
        return await self.repo.get_by_id(initiative.id)

    async def get_initiative(self, initiative_id: UUID) -> Optional[Initiative]:
        return await self.repo.get_by_id(initiative_id)

    async def list_initiatives(self, status: Optional[str] = None, business_unit: Optional[str] = None) -> List[Initiative]:
        return await self.repo.list_initiatives(status=status, business_unit=business_unit)
