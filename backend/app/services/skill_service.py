from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import ai_client
from app.ai.skill_normalizer import normalize_skill_name
from app.models.skill import Skill
from app.repositories.skills import SkillRepository
from app.schemas.skill import SkillCreate


class SkillService:
    def __init__(self, db: AsyncSession):
        self.repo = SkillRepository(db)

    async def list_skills(self, category: Optional[str] = None, search: Optional[str] = None) -> List[Skill]:
        return await self.repo.list_skills(category=category, search=search)

    async def create_skill(self, skill_in: SkillCreate) -> Skill:
        normalized_name = normalize_skill_name(skill_in.name)
        skill_in.name = normalized_name
        embedding = await ai_client.generate_embedding(f"{skill_in.name}: {skill_in.description or ''}")
        return await self.repo.create(skill_in, embedding=embedding)
