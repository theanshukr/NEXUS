import json
import logging
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class AIClient:
    """Unified AI client supporting OpenAI, mock mode, and fallback generation."""

    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.model = settings.LLM_MODEL
        self.provider = settings.LLM_PROVIDER

    async def generate_chat_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        json_mode: bool = False,
    ) -> str:
        """Execute chat completion with LLM or robust fallback if no key provided."""
        if not self.api_key or self.provider == "mock":
            logger.info("Using mock AI generation mode (no API key configured)")
            return self._mock_completion(system_prompt, user_prompt, json_mode)

        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=self.api_key)
            response_format = {"type": "json_object"} if json_mode else None

            response = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format=response_format,
                temperature=0.2,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}. Falling back to mock generator.")
            return self._mock_completion(system_prompt, user_prompt, json_mode)

    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate text vector embedding."""
        if not self.api_key or self.provider == "mock":
            # Generate deterministic pseudo-embedding for testing without OpenAI key
            return self._mock_embedding(text)

        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=self.api_key)
            response = await client.embeddings.create(
                model=settings.EMBEDDING_MODEL,
                input=text,
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"OpenAI Embedding call failed: {e}. Returning mock embedding.")
            return self._mock_embedding(text)

    def _mock_completion(self, system_prompt: str, user_prompt: str, json_mode: bool) -> str:
        if json_mode:
            # Deterministic intelligent extraction for mock demo
            desc_lower = user_prompt.lower()
            skills = []
            if "fastapi" in desc_lower or "python" in desc_lower or "backend" in desc_lower or "api" in desc_lower:
                skills.append({
                    "name": "FastAPI",
                    "category": "Frameworks",
                    "min_proficiency": 4,
                    "importance": "Required",
                    "weight": 1.5,
                    "rationale": "Core framework required for microservices and API development",
                })
                skills.append({
                    "name": "Python",
                    "category": "Languages",
                    "min_proficiency": 4,
                    "importance": "Required",
                    "weight": 1.2,
                    "rationale": "Primary backend implementation language",
                })
            if "react" in desc_lower or "frontend" in desc_lower or "ui" in desc_lower:
                skills.append({
                    "name": "React",
                    "category": "Frameworks",
                    "min_proficiency": 4,
                    "importance": "Required",
                    "weight": 1.4,
                    "rationale": "High-performance interactive web user interface",
                })
                skills.append({
                    "name": "TypeScript",
                    "category": "Languages",
                    "min_proficiency": 3,
                    "importance": "Required",
                    "weight": 1.1,
                    "rationale": "Type safety across UI components",
                })
            if "database" in desc_lower or "sql" in desc_lower or "postgres" in desc_lower or "vector" in desc_lower:
                skills.append({
                    "name": "PostgreSQL",
                    "category": "Data/AI",
                    "min_proficiency": 4,
                    "importance": "Required",
                    "weight": 1.3,
                    "rationale": "Primary relational and vector store for knowledge retrieval",
                })
            if "docker" in desc_lower or "cloud" in desc_lower or "aws" in desc_lower or "deploy" in desc_lower:
                skills.append({
                    "name": "Docker",
                    "category": "Cloud",
                    "min_proficiency": 3,
                    "importance": "Preferred",
                    "weight": 1.0,
                    "rationale": "Containerized build and deploy pipelines",
                })

            if not skills:
                skills = [
                    {
                        "name": "System Architecture",
                        "category": "Practices",
                        "min_proficiency": 4,
                        "importance": "Required",
                        "weight": 1.5,
                        "rationale": "Architectural governance and scalable platform design",
                    },
                    {
                        "name": "Python",
                        "category": "Languages",
                        "min_proficiency": 3,
                        "importance": "Required",
                        "weight": 1.0,
                        "rationale": "Core business logic execution",
                    },
                ]

            mock_response = {
                "title": "Extracted Strategic Initiative",
                "summary": "AI-analyzed technical initiative requiring cross-functional engineering capability.",
                "complexity_level": "High",
                "estimated_roles": ["Lead Full-Stack Engineer", "Cloud Solutions Architect"],
                "suggested_skills": skills,
            }
            return json.dumps(mock_response)
        else:
            return (
                "Candidate demonstrates exceptional technical alignment with strong historical delivery in similar domains. "
                "Core required competencies are well-verified with substantial project evidence. Any minor gaps can be rapidly closed via peer ramp-up."
            )

    def _mock_embedding(self, text: str) -> List[float]:
        import hashlib
        import math
        # Generate 1536 float values deterministically from hash
        seed = int(hashlib.md5(text.encode("utf-8")).hexdigest(), 16)
        vec = []
        for i in range(1536):
            val = math.sin(seed + i) * math.cos(i)
            vec.append(round(val, 6))
        return vec


ai_client = AIClient()
