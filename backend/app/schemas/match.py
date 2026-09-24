from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field

from app.schemas.employee import EmployeeOut
from app.schemas.skill import SkillOut


class MatchSkillOut(BaseModel):
    id: UUID
    skill_id: UUID
    skill: SkillOut
    required_proficiency: int
    employee_proficiency: int
    match_type: str  # Direct, Transferable, Partial, Missing
    score: float

    class Config:
        from_attributes = True


class GapSummary(BaseModel):
    covered_skills: List[str] = []
    partial_skills: List[str] = []
    missing_skills: List[str] = []
    risk_level: str = "Low"  # Low, Moderate, High, Critical
    upskilling_recommendations: List[str] = []


class MatchOut(BaseModel):
    id: UUID
    initiative_id: UUID
    employee_id: UUID
    employee: Optional[EmployeeOut] = None
    overall_score: float
    skill_score: float
    semantic_score: float
    experience_score: float
    evidence_score: float
    rank: Optional[int] = None
    explanation: Optional[str] = None
    gap_summary: Optional[Dict[str, Any]] = None
    evidence_items: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    match_skills: List[MatchSkillOut] = []

    class Config:
        from_attributes = True


class MatchFilterParams(BaseModel):
    min_score: float = 0.0
    department: Optional[str] = None
    availability: Optional[str] = None
    limit: int = 10
