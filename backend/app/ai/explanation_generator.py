from typing import Any, Dict, List
from app.ai.client import ai_client
from app.ai.prompts import EXPLANATION_GENERATION_SYSTEM_PROMPT


class ExplanationGenerator:
    async def generate_explanation(
        self,
        employee_name: str,
        employee_title: str,
        initiative_title: str,
        overall_score: float,
        matched_skills: List[Dict[str, Any]],
        gap_summary: Dict[str, Any],
        project_count: int,
    ) -> str:
        user_prompt = f"""
Candidate: {employee_name} ({employee_title})
Initiative: {initiative_title}
Match Score: {overall_score}%
Project History Count: {project_count}
Direct/Transferable Skills: {', '.join(gap_summary.get('covered_skills', []))}
Partial/Transferable Skills: {', '.join(gap_summary.get('partial_skills', []))}
Missing Skills: {', '.join(gap_summary.get('missing_skills', []))}
Risk Level: {gap_summary.get('risk_level', 'Low')}

Please generate a concise, transparent match rationale.
"""
        explanation = await ai_client.generate_chat_completion(
            system_prompt=EXPLANATION_GENERATION_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            json_mode=False,
        )
        return explanation


explanation_generator = ExplanationGenerator()
