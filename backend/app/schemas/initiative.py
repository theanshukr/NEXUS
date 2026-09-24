from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field

from app.schemas.skill import SkillOut, ExtractedSkill


class InitiativeSkillOut(BaseModel):
    id: UUID
    skill_id: UUID
    skill: SkillOut
    min_proficiency: int
    importance: str
    weight: float
    source: str

    class Config:
        from_attributes = True


class InitiativeBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    business_unit: Optional[str] = None
    target_start_date: Optional[date] = None
    target_end_date: Optional[date] = None
    team_size: int = Field(default=3, ge=1)
    raw_requirements: Optional[str] = None


class InitiativeCreate(InitiativeBase):
    pass


class InitiativeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    business_unit: Optional[str] = None
    status: Optional[str] = None
    target_start_date: Optional[date] = None
    target_end_date: Optional[date] = None
    team_size: Optional[int] = None
    raw_requirements: Optional[str] = None


class InitiativeOut(InitiativeBase):
    id: UUID
    status: str
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    required_skills: List[InitiativeSkillOut] = []

    class Config:
        from_attributes = True


class AnalyzeInitiativeRequest(BaseModel):
    description: str
    business_unit: Optional[str] = None


class AnalyzeInitiativeResponse(BaseModel):
    title: str
    suggested_skills: List[ExtractedSkill]
    estimated_roles: List[str] = []
    complexity_level: str = "Medium"
    summary: str
