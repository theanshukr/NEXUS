from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, func

from app.models.skill import Skill
from app.schemas.skill import SkillCreate, SkillUpdate


class SkillRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, skill_id: UUID) -> Optional[Skill]:
        result = await self.db.execute(select(Skill).where(Skill.id == skill_id))
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[Skill]:
        result = await self.db.execute(select(Skill).where(func.lower(Skill.name) == name.strip().lower()))
        return result.scalar_one_or_none()

    async def list_skills(self, category: Optional[str] = None, search: Optional[str] = None, limit: int = 200) -> List[Skill]:
        query = select(Skill)
        if category:
            query = query.where(func.lower(Skill.category) == category.lower())
        if search:
            query = query.where(Skill.name.ilike(f"%{search}%"))
        query = query.order_by(Skill.name).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, skill_in: SkillCreate, embedding: Optional[List[float]] = None) -> Skill:
        skill = Skill(
            name=skill_in.name,
            category=skill_in.category,
            description=skill_in.description,
            embedding=embedding,
        )
        self.db.add(skill)
        await self.db.commit()
        await self.db.refresh(skill)
        return skill

    async def get_or_create(self, name: str, category: str = "General", description: Optional[str] = None) -> Skill:
        existing = await self.get_by_name(name)
        if existing:
            return existing
        skill = Skill(name=name, category=category, description=description)
        self.db.add(skill)
        await self.db.commit()
        await self.db.refresh(skill)
        return skill
