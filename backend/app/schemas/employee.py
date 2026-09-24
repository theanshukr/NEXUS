from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field

from app.schemas.skill import SkillOut


class EmployeeSkillOut(BaseModel):
    id: UUID
    skill_id: UUID
    skill: SkillOut
    proficiency: int
    years_experience: float
    verified: bool
    last_used: Optional[date] = None
    evidence_count: int = 0

    class Config:
        from_attributes = True


class EmployeeProjectOut(BaseModel):
    id: UUID
    project_id: UUID
    role: str
    technologies_used: List[str] = []
    outcomes: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    class Config:
        from_attributes = True


class EmployeeBase(BaseModel):
    name: str
    email: EmailStr
    title: str
    department: str
    seniority: str
    years_experience: float = 0.0
    availability: str = "Available"
    location: Optional[str] = None
    bio: Optional[str] = None
    certifications: List[str] = []


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeOut(EmployeeBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    skills: List[EmployeeSkillOut] = []
    projects: List[EmployeeProjectOut] = []

    class Config:
        from_attributes = True


class EmployeeListItem(EmployeeBase):
    id: UUID
    created_at: datetime
    skills_count: int = 0
    top_skills: List[str] = []

    class Config:
        from_attributes = True


class EmployeeFilterParams(BaseModel):
    department: Optional[str] = None
    seniority: Optional[str] = None
    availability: Optional[str] = None
    skill: Optional[str] = None
    search: Optional[str] = None
    page: int = 1
    page_size: int = 20
