from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func

from app.models.initiative import Initiative, InitiativeSkill
from app.schemas.initiative import InitiativeCreate, InitiativeUpdate


class InitiativeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, initiative_id: UUID) -> Optional[Initiative]:
        query = (
            select(Initiative)
            .options(
                selectinload(Initiative.required_skills).selectinload(InitiativeSkill.skill),
            )
            .where(Initiative.id == initiative_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_initiatives(self, status: Optional[str] = None, business_unit: Optional[str] = None) -> List[Initiative]:
        query = select(Initiative).options(
            selectinload(Initiative.required_skills).selectinload(InitiativeSkill.skill),
        )
        if status:
            query = query.where(func.lower(Initiative.status) == status.lower())
        if business_unit:
            query = query.where(func.lower(Initiative.business_unit) == business_unit.lower())
        query = query.order_by(Initiative.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, initiative_in: InitiativeCreate, created_by_id: Optional[UUID] = None) -> Initiative:
        initiative = Initiative(
            title=initiative_in.title,
            description=initiative_in.description,
            business_unit=initiative_in.business_unit,
            target_start_date=initiative_in.target_start_date,
            target_end_date=initiative_in.target_end_date,
            team_size=initiative_in.team_size,
            raw_requirements=initiative_in.raw_requirements,
            created_by=created_by_id,
        )
        self.db.add(initiative)
        await self.db.commit()
        await self.db.refresh(initiative)
        return initiative

    async def update_status(self, initiative_id: UUID, new_status: str) -> Optional[Initiative]:
        initiative = await self.get_by_id(initiative_id)
        if initiative:
            initiative.status = new_status
            await self.db.commit()
            await self.db.refresh(initiative)
        return initiative
