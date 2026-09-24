from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee
from app.repositories.employees import EmployeeRepository
from app.schemas.employee import EmployeeFilterParams, EmployeeListItem, EmployeeOut


class EmployeeService:
    def __init__(self, db: AsyncSession):
        self.repo = EmployeeRepository(db)

    async def get_employee(self, employee_id: UUID) -> Optional[Employee]:
        return await self.repo.get_by_id(employee_id)

    async def list_employees(self, params: EmployeeFilterParams) -> Dict[str, Any]:
        employees, total_count = await self.repo.list_employees(params)
        
        items = []
        for emp in employees:
            top_skills = [es.skill.name for es in sorted(emp.skills, key=lambda s: s.proficiency, reverse=True)[:4] if es.skill]
            items.append(
                EmployeeListItem(
                    id=emp.id,
                    name=emp.name,
                    email=emp.email,
                    title=emp.title,
                    department=emp.department,
                    seniority=emp.seniority,
                    years_experience=emp.years_experience,
                    availability=emp.availability,
                    location=emp.location,
                    bio=emp.bio,
                    certifications=emp.certifications or [],
                    created_at=emp.created_at,
                    skills_count=len(emp.skills),
                    top_skills=top_skills,
                )
            )

        return {
            "items": items,
            "total": total_count,
            "page": params.page,
            "page_size": params.page_size,
            "total_pages": (total_count + params.page_size - 1) // params.page_size if params.page_size else 1,
        }
