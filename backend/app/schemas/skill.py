from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class SkillBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class SkillCreate(SkillBase):
    pass


class SkillUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None


class SkillOut(SkillBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ExtractedSkill(BaseModel):
    name: str
    category: str
    min_proficiency: int = Field(default=3, ge=1, le=5)
    importance: str = "Required"
    weight: float = 1.0
    rationale: Optional[str] = None
