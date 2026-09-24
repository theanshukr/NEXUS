from typing import List, Optional
import numpy as np


def cosine_similarity(v1: Optional[List[float]], v2: Optional[List[float]]) -> float:
    """Calculate cosine similarity score between 0 and 100."""
    if not v1 or not v2:
        return 50.0  # Fallback neutral similarity
    a = np.array(v1)
    b = np.array(v2)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    cos_sim = np.dot(a, b) / (norm_a * norm_b)
    # Scale from [-1, 1] to [0, 100]
    scaled = ((cos_sim + 1) / 2) * 100.0
    return round(float(scaled), 2)
