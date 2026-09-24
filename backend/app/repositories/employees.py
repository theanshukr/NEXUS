from typing import List, Optional, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_

from app.models.employee import Employee, EmployeeSkill, EmployeeProject
from app.models.skill import Skill
from app.schemas.employee import EmployeeCreate, EmployeeFilterParams


class EmployeeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, employee_id: UUID) -> Optional[Employee]:
        query = (
            select(Employee)
            .options(
                selectinload(Employee.skills).selectinload(EmployeeSkill.skill),
                selectinload(Employee.projects).selectinload(EmployeeProject.project),
            )
            .where(Employee.id == employee_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_employees(
        self,
        params: EmployeeFilterParams,
    ) -> Tuple[List[Employee], int]:
        query = select(Employee).options(
            selectinload(Employee.skills).selectinload(EmployeeSkill.skill),
            selectinload(Employee.projects).selectinload(EmployeeProject.project),
        )

        if params.department:
            query = query.where(func.lower(Employee.department) == params.department.lower())
        if params.seniority:
            query = query.where(func.lower(Employee.seniority) == params.seniority.lower())
        if params.availability:
            query = query.where(func.lower(Employee.availability) == params.availability.lower())
        if params.search:
            search_pattern = f"%{params.search}%"
            query = query.where(
                or_(
                    Employee.name.ilike(search_pattern),
                    Employee.title.ilike(search_pattern),
                    Employee.bio.ilike(search_pattern),
                )
            )
        if params.skill:
            query = query.join(Employee.skills).join(EmployeeSkill.skill).where(
                Skill.name.ilike(f"%{params.skill}%")
            )

        # Count total
        count_query = select(func.count(func.distinct(Employee.id)))
        if params.department:
            count_query = count_query.where(func.lower(Employee.department) == params.department.lower())
        if params.seniority:
            count_query = count_query.where(func.lower(Employee.seniority) == params.seniority.lower())
        if params.availability:
            count_query = count_query.where(func.lower(Employee.availability) == params.availability.lower())
        if params.search:
            search_pattern = f"%{params.search}%"
            count_query = count_query.where(
                or_(
                    Employee.name.ilike(search_pattern),
                    Employee.title.ilike(search_pattern),
                    Employee.bio.ilike(search_pattern),
                )
            )

        count_result = await self.db.execute(count_query)
        total_count = count_result.scalar_one() or 0

        # Pagination
        offset = (params.page - 1) * params.page_size
        query = query.distinct().order_by(Employee.name).offset(offset).limit(params.page_size)

        result = await self.db.execute(query)
        employees = list(result.scalars().all())
        return employees, total_count

    async def get_all_for_matching(self) -> List[Employee]:
        query = select(Employee).options(
            selectinload(Employee.skills).selectinload(EmployeeSkill.skill),
            selectinload(Employee.projects).selectinload(EmployeeProject.project),
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())
