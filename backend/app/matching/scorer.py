from typing import Dict, List, Tuple


def calculate_match_score(
    skill_score: float,
    semantic_score: float,
    experience_score: float,
    evidence_score: float,
    weights: Dict[str, float] = None,
) -> float:
    """
    Calculate the overall match score according to NEXUS Formula:
    Overall Score = (0.50 * Skill Score) + (0.20 * Semantic Score) + (0.15 * Experience Score) + (0.15 * Evidence Score)
    """
    if weights is None:
        weights = {
            "skill": 0.50,
            "semantic": 0.20,
            "experience": 0.15,
            "evidence": 0.15,
        }

    overall = (
        (weights["skill"] * skill_score)
        + (weights["semantic"] * semantic_score)
        + (weights["experience"] * experience_score)
        + (weights["evidence"] * evidence_score)
    )

    return round(max(0.0, min(100.0, overall)), 2)


def calculate_experience_score(years_experience: float, target_years: float = 5.0) -> float:
    """Calculate experience score based on years ratio capped at 100."""
    if target_years <= 0:
        return 100.0
    ratio = years_experience / target_years
    return round(min(100.0, ratio * 100.0), 2)


def calculate_evidence_score(verified_count: int, total_skills: int, project_count: int) -> float:
    """Calculate evidence confidence based on verified skills and project track record."""
    if total_skills == 0:
        return 50.0
    verification_ratio = verified_count / total_skills
    project_factor = min(1.0, project_count / 3.0)  # 3+ projects give full project factor
    score = (verification_ratio * 60.0) + (project_factor * 40.0)
    return round(min(100.0, score), 2)
