from typing import Any, Dict, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.employee import EmployeeFilterParams, EmployeeOut
from app.services.employee_service import EmployeeService

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("")
async def list_employees(
    department: Optional[str] = Query(None),
    seniority: Optional[str] = Query(None),
    availability: Optional[str] = Query(None),
    skill: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve paginated workforce directory with multi-faceted filtering."""
    params = EmployeeFilterParams(
        department=department,
        seniority=seniority,
        availability=availability,
        skill=skill,
        search=search,
        page=page,
        page_size=page_size,
    )
    service = EmployeeService(db)
    return await service.list_employees(params)


@router.get("/{employee_id}", response_model=EmployeeOut)
async def get_employee_detail(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve comprehensive employee profile, skill proficiencies, and project history."""
    service = EmployeeService(db)
    employee = await service.get_employee(employee_id)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )
    return employee
