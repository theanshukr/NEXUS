from typing import Any, Dict, List
from app.models.initiative import InitiativeSkill
from app.models.employee import Employee


def analyze_gaps(
    required_skills: List[InitiativeSkill],
    evaluated_matches: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Analyzes workforce gaps for an initiative:
    - Covered Skills (Direct match with adequate proficiency)
    - Partial Skills (Lower proficiency or transferable)
    - Missing Skills (No match)
    - Risk Level determination
    - Upskilling recommendations
    """
    covered = []
    partial = []
    missing = []
    recommendations = []

    for item in evaluated_matches:
        skill_name = item.get("skill_name", "")
        match_type = item.get("match_type", "Missing")
        importance = item.get("importance", "Required")

        if match_type == "Direct":
            covered.append(skill_name)
        elif match_type in ["Transferable", "Partial"]:
            partial.append(skill_name)
            recommendations.append(f"Accelerated ramp-up in {skill_name} via pairing or targeted workshop.")
        else:
            missing.append(skill_name)
            if importance == "Required":
                recommendations.append(f"High Priority: Hire or contract specialist for required skill '{skill_name}'.")

    # Risk level calculation
    req_total = len(required_skills)
    missing_count = len(missing)
    partial_count = len(partial)

    if req_total == 0:
        risk_level = "Low"
    elif missing_count > (req_total * 0.4):
        risk_level = "Critical"
    elif missing_count > 0 or partial_count > (req_total * 0.5):
        risk_level = "Moderate"
    else:
        risk_level = "Low"

    return {
        "covered_skills": covered,
        "partial_skills": partial,
        "missing_skills": missing,
        "risk_level": risk_level,
        "upskilling_recommendations": recommendations,
    }
