from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.initiative import (
    AnalyzeInitiativeRequest,
    AnalyzeInitiativeResponse,
    InitiativeCreate,
    InitiativeOut,
)
from app.schemas.skill import ExtractedSkill
from app.services.initiative_service import InitiativeService

router = APIRouter(prefix="/initiatives", tags=["Initiatives"])


class CreateInitiativeWithSkillsPayload(BaseModel):
    initiative: InitiativeCreate
    skills: List[Dict[str, Any]]


@router.post("/analyze", response_model=AnalyzeInitiativeResponse)
async def analyze_initiative_text(
    req: AnalyzeInitiativeRequest,
    current_user: User = Depends(get_current_user),
):
    """Use AI to extract required skills, scope summary, and roles from natural language."""
    service = InitiativeService(None)
    return await service.analyze_requirements(req)


@router.get("", response_model=List[InitiativeOut])
async def list_initiatives(
    status_filter: Optional[str] = Query(None, alias="status"),
    business_unit: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all strategic initiatives."""
    service = InitiativeService(db)
    return await service.list_initiatives(status=status_filter, business_unit=business_unit)


@router.post("", response_model=InitiativeOut, status_code=status.HTTP_201_CREATED)
async def create_initiative(
    payload: CreateInitiativeWithSkillsPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new initiative with linked skills requirements."""
    service = InitiativeService(db)
    return await service.create_initiative_with_skills(
        initiative_in=payload.initiative,
        skills_data=payload.skills,
        created_by_id=current_user.id,
    )


@router.get("/{initiative_id}", response_model=InitiativeOut)
async def get_initiative_detail(
    initiative_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve details for a specific initiative."""
    service = InitiativeService(db)
    initiative = await service.get_initiative(initiative_id)
    if not initiative:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Initiative not found",
        )
    return initiative
