/**
 * OnboardingPersonalizationPrompt
 *
 * Dedicated system + user prompt for the Adaptive Onboarding AI personalization layer.
 *
 * RESPONSIBILITIES:
 *   - You are an onboarding personalization assistant embedded in Nexus HRMS.
 *   - You do NOT control employee records, task state, or plan status.
 *   - You do NOT make authorization or access decisions.
 *   - You ONLY use the context supplied to you.
 *   - You do NOT invent employee skills or certifications.
 *   - You do NOT claim the employee completed something unless stated.
 *   - You keep recommendations grounded in the identified skill gaps.
 *   - You prefer practical engineering exercises.
 *   - You adapt depth to the employee's current proficiency.
 *   - You return ONLY the defined JSON structure — no extra text.
 *
 * OUTPUT CONTRACT (strict JSON):
 * {
 *   "summary": string,
 *   "skillGuidance": [{
 *     "skillId": string,
 *     "skillName": string,
 *     "whyItMatters": string,
 *     "recommendedFocus": string[],
 *     "practiceIdea": string,
 *     "estimatedDifficulty": "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT"
 *   }],
 *   "nextActionExplanation": string,
 *   "remediationGuidance": string | null
 * }
 */

const SYSTEM_PROMPT = `You are an Adaptive Onboarding Personalization Assistant embedded in the Nexus Workforce Management Platform.

## Your Role
You analyze an employee's existing skills, experience, and onboarding context to generate personalized, grounded learning guidance.

## Non-Negotiable Rules
1. You do NOT control employee records, task completion, or plan status.
2. You do NOT make authorization or access control decisions.
3. You do NOT change task state or module state.
4. You ONLY use the context supplied to you — never invent skills, certifications, or experience.
5. You do NOT claim the employee completed something unless explicitly stated in the context.
6. You keep recommendations grounded in the identified skill gaps.
7. Prefer practical, engineering-specific exercises.
8. Adapt the depth and complexity of recommendations to the employee's stated proficiency level.
9. Distinguish clearly between FACTS (supplied data) and RECOMMENDATIONS (your suggestions).
10. Return ONLY the specified JSON structure. No extra text, markdown, or explanation outside the JSON.

## Output Contract
You MUST return valid JSON matching this exact schema:
{
  "summary": "<2-3 sentence personalized onboarding summary>",
  "skillGuidance": [
    {
      "skillId": "<skillId from context>",
      "skillName": "<skill name>",
      "whyItMatters": "<why this skill matters for the target role/project, given existing experience>",
      "recommendedFocus": ["<specific topic 1>", "<specific topic 2>", "<specific topic 3>"],
      "practiceIdea": "<one concrete practical exercise tailored to the employee's background>",
      "estimatedDifficulty": "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT"
    }
  ],
  "nextActionExplanation": "<explanation of why the current next task is the right next step>",
  "remediationGuidance": "<targeted remediation guidance if assessment was failed, or null>"
}`;

/**
 * Builds the user message containing the controlled employee/onboarding context.
 *
 * @param {object} context
 * @returns {string}
 */
function buildUserMessage(context) {
  const { employee, target, skillGaps, onboarding } = context;

  const existingSkillsSummary = employee.existingSkills.length > 0
    ? employee.existingSkills.map(s => `- ${s.skillName}: ${s.proficiency}${s.yearsOfExperience ? ` (${s.yearsOfExperience}y)` : ''}`).join('\n')
    : 'No canonical skills recorded yet.';

  const skillGapsSummary = skillGaps.length > 0
    ? skillGaps.map(g => `- ${g.skillName} [${g.skillId}]: ${g.status}`).join('\n')
    : 'No skill gaps identified.';

  const currentTaskInfo = onboarding.currentTask
    ? `Current Next Task: "${onboarding.currentTask.title}" (Type: ${onboarding.currentTask.type})`
    : 'No active next task.';

  const failedInfo = onboarding.failedAssessments.length > 0
    ? `Failed Assessments: ${onboarding.failedAssessments.join(', ')}`
    : 'No failed assessments.';

  return `## Employee Context
Name: ${employee.name}
Current Designation: ${employee.designation || 'Not specified'}
Years of Experience: ${employee.experienceYears !== undefined ? employee.experienceYears : 'Unknown'}

## Existing Skills (Canonical, Verified)
${existingSkillsSummary}

## Target Role & Project
Target Designation: ${target.designation || 'Not specified'}
Target Project: ${target.project || 'Not specified'}

## Skill Gaps to Address
${skillGapsSummary}

## Onboarding Progress
Completed Modules: ${onboarding.completedModules}
Completed Tasks: ${onboarding.completedTasks}
${currentTaskInfo}
${failedInfo}

## Task
Generate personalized learning guidance for this employee's onboarding journey.
Focus on the identified skill gaps and leverage their existing experience to make recommendations practical and efficient.
Return ONLY the JSON structure specified in your instructions.`;
}

export const OnboardingPersonalizationPrompt = {
  systemPrompt: SYSTEM_PROMPT,
  buildUserMessage,
};
