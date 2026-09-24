from typing import Dict

# Aliases and normalization map
CANONICAL_SKILL_MAP: Dict[str, str] = {
    "reactjs": "React",
    "react.js": "React",
    "react": "React",
    "fast-api": "FastAPI",
    "fastapi": "FastAPI",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "postgres sql": "PostgreSQL",
    "ts": "TypeScript",
    "typescript": "TypeScript",
    "js": "JavaScript",
    "javascript": "JavaScript",
    "py": "Python",
    "python3": "Python",
    "python": "Python",
    "aws cloud": "AWS",
    "amazon web services": "AWS",
    "aws": "AWS",
    "k8s": "Kubernetes",
    "kubernetes": "Kubernetes",
    "docker containers": "Docker",
    "docker": "Docker",
    "ai/ml": "Machine Learning",
    "ml": "Machine Learning",
    "machine learning": "Machine Learning",
}


def normalize_skill_name(raw_name: str) -> str:
    """Standardize raw skill names into canonical names."""
    cleaned = raw_name.strip().lower()
    return CANONICAL_SKILL_MAP.get(cleaned, raw_name.strip().title())
