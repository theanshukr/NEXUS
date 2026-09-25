import axios from 'axios';
import { z } from 'zod';
import { OnboardingPersonalizationPrompt } from '../prompts/OnboardingPersonalizationPrompt.js';

/**
 * AI_PLATFORM_URL — The base URL of the NEXUS AI platform service.
 * Defaults to port 8001 (standard AI platform dev port).
 * Configured via AI_PLATFORM_URL env var.
 */
const AI_PLATFORM_URL = process.env.AI_PLATFORM_URL || 'http://localhost:8001/api/v1/ai';

/**
 * Zod schema for the AI personalization response output contract.
 * The server validates ALL model output before returning it to the client.
 * Invalid output is rejected — never forwarded to the client.
 */
const SkillGuidanceSchema = z.object({
  skillId: z.string(),
  skillName: z.string(),
  whyItMatters: z.string(),
  recommendedFocus: z.array(z.string()),
  practiceIdea: z.string(),
  estimatedDifficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
});

const PersonalizationResponseSchema = z.object({
  summary: z.string(),
  skillGuidance: z.array(SkillGuidanceSchema),
  nextActionExplanation: z.string(),
  remediationGuidance: z.string().nullable(),
});

/**
 * OnboardingAIService
 *
 * The AI personalization advisory layer for the Adaptive Onboarding system.
 *
 * RESPONSIBILITIES:
 * - Build a controlled, tenant-validated AI context from server-side data.
 * - Call the existing NEXUS AI platform's /complete endpoint.
 * - Validate the structured JSON response against the output contract.
 * - Return guidance to the controller — never persist it automatically.
 *
 * HARD CONSTRAINTS:
 * - This service is READ-ONLY. It NEVER modifies:
 *   EmployeeSkill, EmployeeProfileExtended, OnboardingPlan, Skill,
 *   Designation, Project, or any other HR record.
 * - The deterministic AdaptiveOnboardingService remains the source of truth.
 * - If the AI platform is unavailable, the service returns { aiAvailable: false }.
 * - It does NOT bypass tenant isolation or authentication.
 */
class OnboardingAIService {
  /**
   * Build a controlled context and call the AI personalization endpoint.
   *
   * @param {object} params
   * @param {object} params.plan         - Populated OnboardingPlan document
   * @param {object} params.employee     - Employee document
   * @param {object} params.employeeProfile - EmployeeProfileExtended with employeeSkills
   * @param {object} params.skillGapResult  - Result from SkillGapAnalysisService
   * @param {object} params.nextAction      - Current next action from AdaptiveOnboardingService
   * @param {string} params.accessToken     - The user's JWT access token (forwarded to AI platform)
   * @returns {Promise<object>}             - Structured personalization guidance or error
   */
  async getGuidance({ plan, employee, employeeProfile, skillGapResult, nextAction, accessToken }) {
    // 1. Build the controlled, server-side context (never trust client-supplied context)
    const aiContext = this._buildContext({ plan, employee, employeeProfile, skillGapResult, nextAction });

    // 2. Build messages in OpenAI format
    const messages = [
      { role: 'system', content: OnboardingPersonalizationPrompt.systemPrompt },
      { role: 'user', content: OnboardingPersonalizationPrompt.buildUserMessage(aiContext) },
    ];

    // 3. Call the AI platform — fail gracefully if unavailable
    let rawContent;
    try {
      const response = await axios.post(
        `${AI_PLATFORM_URL}/complete`,
        { messages, options: { temperature: 0.3, maxTokens: 1500 } },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 20000, // 20s timeout — onboarding must not hang
        }
      );

      if (!response.data?.success) {
        return this._unavailableResponse('AI_PLATFORM_ERROR');
      }
      rawContent = response.data.content;
    } catch (err) {
      const code = err.response?.status === 503 ? 'AI_UNAVAILABLE' : 'AI_PLATFORM_UNREACHABLE';
      return this._unavailableResponse(code);
    }

    // 4. Extract and validate JSON from model output
    const parsed = this._extractAndValidateJSON(rawContent);
    if (!parsed.success) {
      return this._unavailableResponse('AI_INVALID_OUTPUT');
    }

    return {
      success: true,
      aiAvailable: true,
      guidance: parsed.data,
      context: {
        // Return what was sent to the AI (minus system prompt) for transparency
        employeeName: aiContext.employee.name,
        targetDesignation: aiContext.target.designation,
        targetProject: aiContext.target.project,
        skillGapsAddressed: aiContext.skillGaps.length,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Personalize a single task — returns focused guidance for one task.
   *
   * @param {object} params
   * @param {object} params.task         - Task object from OnboardingPlan
   * @param {object} params.module       - Module containing the task
   * @param {object} params.employee     - Employee document
   * @param {object} params.employeeProfile - EmployeeProfileExtended
   * @param {string} params.accessToken
   * @returns {Promise<object>}
   */
  async getTaskGuidance({ task, module: mod, employee, employeeProfile, accessToken }) {
    const existingSkillsSummary = (employeeProfile?.employeeSkills || [])
      .map(s => `${s.skillId?.canonicalName || 'Unknown'}: ${s.proficiency}`)
      .join(', ') || 'No skills recorded.';

    const taskPrompt = `You are a personalized onboarding task advisor.

Given:
- Employee: ${employee.firstName} ${employee.lastName}
- Task: "${task.title}" (Type: ${task.type})
- Module: "${mod.title}"
- Employee's existing skills: ${existingSkillsSummary}

Return a JSON object:
{
  "personalizedDescription": "<tailored 2-3 sentence task description based on their background>",
  "keyTechniques": ["<technique 1>", "<technique 2>"],
  "estimatedTime": "<e.g., 2-4 hours>",
  "successCriteria": "<how the employee knows they've succeeded>"
}

Return ONLY the JSON.`;

    const messages = [
      { role: 'system', content: OnboardingPersonalizationPrompt.systemPrompt },
      { role: 'user', content: taskPrompt },
    ];

    try {
      const response = await axios.post(
        `${AI_PLATFORM_URL}/complete`,
        { messages, options: { temperature: 0.3, maxTokens: 500 } },
        {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          timeout: 15000,
        }
      );

      if (!response.data?.success) return this._unavailableResponse('AI_PLATFORM_ERROR');

      const parsed = this._extractAndValidateJSON(response.data.content);
      if (!parsed.success) return this._unavailableResponse('AI_INVALID_OUTPUT');

      return {
        success: true,
        aiAvailable: true,
        taskGuidance: parsed.data,
        generatedAt: new Date().toISOString(),
      };
    } catch {
      return this._unavailableResponse('AI_PLATFORM_UNREACHABLE');
    }
  }

  /**
   * Build a controlled context object from server-side data.
   * NEVER accepts context from the client.
   */
  _buildContext({ plan, employee, employeeProfile, skillGapResult, nextAction }) {
    const existingSkills = (employeeProfile?.employeeSkills || []).map(es => ({
      skillName: es.skillId?.canonicalName || 'Unknown',
      proficiency: es.proficiency,
      yearsOfExperience: es.yearsOfExperience,
    }));

    const skillGaps = (skillGapResult?.skillGaps || []).map(g => ({
      skillId: g.skillId?.toString() || '',
      skillName: g.skill || g.skillName || 'Unknown',
      status: g.status || 'MISSING',
    }));

    // Count completed modules and tasks
    const completedModules = (plan.modules || []).filter(m => m.status === 'COMPLETED').length;
    const completedTasks = (plan.modules || [])
      .flatMap(m => m.tasks || [])
      .filter(t => t.status === 'COMPLETED').length;

    // Collect failed assessments
    const failedAssessments = (plan.modules || [])
      .flatMap(m => m.tasks || [])
      .filter(t => t.type === 'ASSESSMENT' && t.status === 'FAILED')
      .map(t => t.title);

    return {
      employee: {
        name: `${employee.firstName} ${employee.lastName}`,
        designation: employee.designationId?.title || null,
        experienceYears: undefined, // Not stored in current schema — omit
        existingSkills,
      },
      target: {
        designation: plan.targetDesignationId?.title || null,
        project: plan.targetProjectId?.name || null,
      },
      skillGaps,
      onboarding: {
        completedModules,
        completedTasks,
        currentTask: nextAction?.nextAction
          ? { title: nextAction.nextAction.title, type: nextAction.nextAction.type }
          : null,
        failedAssessments,
      },
    };
  }

  /**
   * Extract the first JSON object from a string and validate it.
   */
  _extractAndValidateJSON(text) {
    try {
      // Find the first { ... } block in the text
      const startIdx = text.indexOf('{');
      const endIdx = text.lastIndexOf('}');
      if (startIdx === -1 || endIdx === -1) {
        return { success: false, error: 'No JSON object found in response' };
      }
      const jsonStr = text.substring(startIdx, endIdx + 1);
      const raw = JSON.parse(jsonStr);

      // Try full personalization schema first, then pass raw if it doesn't match
      const result = PersonalizationResponseSchema.safeParse(raw);
      if (result.success) {
        return { success: true, data: result.data };
      }

      // If it's a task-specific response, return raw (validated ad-hoc)
      if (raw.personalizedDescription || raw.keyTechniques) {
        return { success: true, data: raw };
      }

      return { success: false, error: result.error.message };
    } catch (err) {
      return { success: false, error: `JSON parse error: ${err.message}` };
    }
  }

  _unavailableResponse(code = 'AI_UNAVAILABLE') {
    return {
      success: false,
      aiAvailable: false,
      error: { code },
    };
  }
}

export const onboardingAIService = new OnboardingAIService();
export default onboardingAIService;
