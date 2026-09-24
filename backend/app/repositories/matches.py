from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, delete

from app.models.match import Match, MatchSkill
from app.models.employee import Employee, EmployeeSkill, EmployeeProject


class MatchRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, match_id: UUID) -> Optional[Match]:
        query = (
            select(Match)
            .options(
                selectinload(Match.employee).selectinload(Employee.skills).selectinload(EmployeeSkill.skill),
                selectinload(Match.employee).selectinload(Employee.projects).selectinload(EmployeeProject.project),
                selectinload(Match.match_skills).selectinload(MatchSkill.skill),
            )
            .where(Match.id == match_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_matches_for_initiative(
        self,
        initiative_id: UUID,
        min_score: float = 0.0,
        limit: int = 20,
    ) -> List[Match]:
        query = (
            select(Match)
            .options(
                selectinload(Match.employee).selectinload(Employee.skills).selectinload(EmployeeSkill.skill),
                selectinload(Match.employee).selectinload(Employee.projects).selectinload(EmployeeProject.project),
                selectinload(Match.match_skills).selectinload(MatchSkill.skill),
            )
            .where(Match.initiative_id == initiative_id)
            .where(Match.overall_score >= min_score)
            .order_by(Match.overall_score.desc())
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def delete_for_initiative(self, initiative_id: UUID):
        await self.db.execute(delete(Match).where(Match.initiative_id == initiative_id))
        await self.db.commit()

    async def save_matches(self, matches: List[Match]) -> List[Match]:
        for match in matches:
            self.db.add(match)
        await self.db.commit()
        return matches
