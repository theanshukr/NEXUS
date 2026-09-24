from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class MetricCard(BaseModel):
    title: str
    value: str
    change: Optional[str] = None
    change_type: Optional[str] = None  # positive, negative, neutral
    icon: Optional[str] = None


class SkillCoverageItem(BaseModel):
    category: str
    total_skills: int
    covered_skills: int
    coverage_percentage: float
    high_demand_skills: List[str] = []


class DepartmentReadiness(BaseModel):
    department: str
    headcount: int
    readiness_score: float
    top_initiative_fit: Optional[str] = None


class DashboardOverview(BaseModel):
    metrics: List[MetricCard]
    skill_coverage: List[SkillCoverageItem]
    department_readiness: List[DepartmentReadiness]
    recent_initiatives_count: int
    top_critical_gaps: List[str]
