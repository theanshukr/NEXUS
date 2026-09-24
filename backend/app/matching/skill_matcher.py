from typing import Dict, List, Tuple
from app.models.employee import EmployeeSkill
from app.models.initiative import InitiativeSkill

# Canonical transferable mappings
TRANSFERABLE_CLUSTERS = {
    "react": ["vue", "angular", "svelte", "next.js", "frontend architecture"],
    "fastapi": ["flask", "django", "express.js", "nest.js", "rest api"],
    "postgresql": ["mysql", "sqlite", "oracle", "sql server", "database design"],
    "aws": ["gcp", "azure", "cloud architecture", "kubernetes"],
    "python": ["typescript", "go", "java", "backend engineering"],
    "docker": ["kubernetes", "ci/cd", "devops", "containerization"],
    "pytorch": ["tensorflow", "machine learning", "deep learning", "nlp"],
}


def evaluate_skill_match(
    req: InitiativeSkill,
    emp_skills_map: Dict[str, EmployeeSkill],
) -> Tuple[str, float, int]:
    """
    Evaluates how an employee matches a specific required initiative skill.
    Returns: (match_type, skill_score_0_to_100, employee_proficiency)
    Match types: Direct (100%), Transferable (70%), Partial (40%), Missing (0%)
    """
    req_name = req.skill.name.lower().strip() if req.skill else ""
    req_proficiency = req.min_proficiency

    # 1. Check Direct Match
    if req_name in emp_skills_map:
        emp_skill = emp_skills_map[req_name]
        emp_prof = emp_skill.proficiency
        if emp_prof >= req_proficiency:
            return "Direct", 100.0, emp_prof
        else:
            # Partial direct match based on ratio
            ratio = emp_prof / req_proficiency
            score = round(ratio * 75.0, 2)
            return "Partial", score, emp_prof

    # 2. Check Transferable Match
    related_skills = TRANSFERABLE_CLUSTERS.get(req_name, [])
    for related in related_skills:
        if related in emp_skills_map:
            emp_skill = emp_skills_map[related]
            emp_prof = emp_skill.proficiency
            transfer_score = 70.0 if emp_prof >= req_proficiency else round((emp_prof / req_proficiency) * 50.0, 2)
            return "Transferable", transfer_score, emp_prof

    # 3. Missing
    return "Missing", 0.0, 0
