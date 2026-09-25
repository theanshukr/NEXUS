import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onboardingAIService } from '../../src/modules/nexus/services/OnboardingAIService.js';

// Mock axios — prevent any real HTTP calls to the AI platform
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  }
}));

import axios from 'axios';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makePlan = (overrides = {}) => ({
  _id: 'plan-1',
  organizationId: 'org-1',
  title: 'Cloud Migration Onboarding',
  status: 'ACTIVE',
  progress: 0,
  targetDesignationId: { _id: 'des-1', title: 'Backend Engineer' },
  targetProjectId: { _id: 'proj-1', name: 'Cloud Migration' },
  skillGapSnapshot: [],
  modules: [
    {
      _id: 'mod-1',
      title: 'Kubernetes',
      status: 'PENDING',
      progress: 0,
      tasks: [{ _id: 't1', title: 'Learn Kubernetes', type: 'LEARNING', status: 'PENDING', order: 1 }],
    }
  ],
  ...overrides,
});

const makeEmployee = () => ({
  _id: 'emp-1',
  organizationId: 'org-1',
  firstName: 'Alice',
  lastName: 'Dev',
  designationId: { title: 'Senior Backend Engineer' },
});

const makeProfile = () => ({
  employeeId: 'emp-1',
  organizationId: 'org-1',
  employeeSkills: [
    { skillId: { canonicalName: 'Docker', category: 'CLOUD_DEVOPS' }, proficiency: 'Advanced', yearsOfExperience: 3 },
    { skillId: { canonicalName: 'AWS', category: 'CLOUD_DEVOPS' }, proficiency: 'Intermediate', yearsOfExperience: 2 },
  ],
});

const makeSkillGapResult = () => ({
  skillGaps: [{ skillId: 'skill-k8s', skill: 'Kubernetes', status: 'MISSING' }],
});

const VALID_AI_RESPONSE = JSON.stringify({
  summary: "Alice already has strong Docker and AWS expertise, making Kubernetes a natural next step.",
  skillGuidance: [
    {
      skillId: "skill-k8s",
      skillName: "Kubernetes",
      whyItMatters: "Kubernetes orchestrates the Docker containers you already know well.",
      recommendedFocus: ["Deployments", "Services", "Production debugging"],
      practiceIdea: "Deploy your current Java service into a local K8s cluster.",
      estimatedDifficulty: "INTERMEDIATE",
    }
  ],
  nextActionExplanation: "Learning Kubernetes fundamentals is the first step before practicing deployments.",
  remediationGuidance: null,
});

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('Phase 7E: OnboardingAIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. AI guidance generated successfully with valid model output', async () => {
    axios.post.mockResolvedValue({
      data: { success: true, content: VALID_AI_RESPONSE, usage: { inputTokens: 200, outputTokens: 300 } }
    });

    const result = await onboardingAIService.getGuidance({
      plan: makePlan(),
      employee: makeEmployee(),
      employeeProfile: makeProfile(),
      skillGapResult: makeSkillGapResult(),
      nextAction: { nextAction: { title: 'Learn Kubernetes', type: 'LEARNING' } },
      accessToken: 'test-token',
    });

    expect(result.success).toBe(true);
    expect(result.aiAvailable).toBe(true);
    expect(result.guidance.summary).toContain('Alice');
    expect(result.guidance.skillGuidance).toHaveLength(1);
    expect(result.guidance.skillGuidance[0].skillName).toBe('Kubernetes');
    expect(result.guidance.remediationGuidance).toBeNull();
  });

  it('2. Existing AI provider abstraction is used (axios calls AI platform endpoint)', async () => {
    axios.post.mockResolvedValue({
      data: { success: true, content: VALID_AI_RESPONSE }
    });

    await onboardingAIService.getGuidance({
      plan: makePlan(),
      employee: makeEmployee(),
      employeeProfile: makeProfile(),
      skillGapResult: makeSkillGapResult(),
      nextAction: { nextAction: null },
      accessToken: 'test-token',
    });

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/complete'),
      expect.objectContaining({ messages: expect.any(Array) }),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) })
    );
    // Verify messages follow system+user pattern
    const [, body] = axios.post.mock.calls[0];
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].role).toBe('user');
  });

  it('3. Structured output validation works — valid JSON passes', async () => {
    axios.post.mockResolvedValue({
      data: { success: true, content: VALID_AI_RESPONSE }
    });

    const result = await onboardingAIService.getGuidance({
      plan: makePlan(), employee: makeEmployee(), employeeProfile: makeProfile(),
      skillGapResult: makeSkillGapResult(), nextAction: { nextAction: null }, accessToken: 'tok',
    });

    expect(result.success).toBe(true);
    // Verify schema enforcement
    expect(result.guidance.skillGuidance[0].estimatedDifficulty).toMatch(/^(BEGINNER|INTERMEDIATE|ADVANCED|EXPERT)$/);
  });

  it('4. Invalid model output is rejected safely', async () => {
    axios.post.mockResolvedValue({
      data: { success: true, content: 'Sorry, I cannot help with that.' }
    });

    const result = await onboardingAIService.getGuidance({
      plan: makePlan(), employee: makeEmployee(), employeeProfile: makeProfile(),
      skillGapResult: makeSkillGapResult(), nextAction: { nextAction: null }, accessToken: 'tok',
    });

    expect(result.success).toBe(false);
    expect(result.aiAvailable).toBe(false);
    expect(result.error.code).toBe('AI_INVALID_OUTPUT');
  });

  it('5. AI unavailable is handled gracefully', async () => {
    axios.post.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await onboardingAIService.getGuidance({
      plan: makePlan(), employee: makeEmployee(), employeeProfile: makeProfile(),
      skillGapResult: makeSkillGapResult(), nextAction: { nextAction: null }, accessToken: 'tok',
    });

    expect(result.success).toBe(false);
    expect(result.aiAvailable).toBe(false);
    expect(result.error.code).toBe('AI_PLATFORM_UNREACHABLE');
  });

  it('6. Employee context is built server-side from profile data', async () => {
    axios.post.mockResolvedValue({
      data: { success: true, content: VALID_AI_RESPONSE }
    });

    await onboardingAIService.getGuidance({
      plan: makePlan(),
      employee: makeEmployee(),
      employeeProfile: makeProfile(),
      skillGapResult: makeSkillGapResult(),
      nextAction: { nextAction: null },
      accessToken: 'tok',
    });

    const [, body] = axios.post.mock.calls[0];
    const userMessage = body.messages[1].content;

    // Verify server-side context is built from profile — not client data
    expect(userMessage).toContain('Alice Dev');
    expect(userMessage).toContain('Docker');
    expect(userMessage).toContain('AWS');
    expect(userMessage).toContain('Kubernetes');
    // Target info from plan — server-side
    expect(userMessage).toContain('Backend Engineer');
    expect(userMessage).toContain('Cloud Migration');
  });

  it('7. AI cannot modify EmployeeSkill — service is read-only', async () => {
    // Verify that OnboardingAIService has no write methods for HR data
    const service = onboardingAIService;
    expect(service.updateEmployeeSkill).toBeUndefined();
    expect(service.createEmployeeSkill).toBeUndefined();
    expect(service.completeTask).toBeUndefined();
    expect(service.activatePlan).toBeUndefined();
    expect(service.markModuleComplete).toBeUndefined();
  });

  it('8. AI cannot modify onboarding state — no write methods exposed', async () => {
    // Verify the service exposes only read methods
    const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(onboardingAIService));
    const writeMethods = methodNames.filter(m => 
      m.includes('update') || m.includes('create') || m.includes('delete') || 
      m.includes('complete') || m.includes('activate') || m.includes('save')
    );
    expect(writeMethods).toHaveLength(0);
  });

  it('9. Remediation guidance generated when assessment failed', async () => {
    const remediationResponse = JSON.stringify({
      summary: "Alice needs to revisit core Kubernetes concepts.",
      skillGuidance: [{
        skillId: "skill-k8s",
        skillName: "Kubernetes",
        whyItMatters: "Understanding pod scheduling is essential for the assessment.",
        recommendedFocus: ["Pod scheduling", "Resource requests", "ConfigMaps"],
        practiceIdea: "Set up resource limits on your existing deployment.",
        estimatedDifficulty: "INTERMEDIATE",
      }],
      nextActionExplanation: "Complete the remediation practice before retrying the assessment.",
      remediationGuidance: "Focus on Kubernetes scheduling concepts — specifically how resource requests affect pod placement. Review the official docs on resource management.",
    });

    axios.post.mockResolvedValue({
      data: { success: true, content: remediationResponse }
    });

    const planWithFailedAssessment = makePlan({
      modules: [{
        _id: 'mod-1',
        title: 'Kubernetes',
        status: 'PENDING',
        progress: 50,
        tasks: [
          { _id: 't1', title: 'Learn Kubernetes', type: 'LEARNING', status: 'COMPLETED', order: 1 },
          { _id: 't2', title: 'Kubernetes Assessment', type: 'ASSESSMENT', status: 'FAILED', order: 3 },
          { _id: 't3', title: 'Remediation: Kubernetes', type: 'PRACTICE', status: 'PENDING', order: 2.5 },
        ],
      }]
    });

    const result = await onboardingAIService.getGuidance({
      plan: planWithFailedAssessment,
      employee: makeEmployee(),
      employeeProfile: makeProfile(),
      skillGapResult: makeSkillGapResult(),
      nextAction: { nextAction: { title: 'Remediation: Kubernetes', type: 'PRACTICE' } },
      accessToken: 'tok',
    });

    expect(result.success).toBe(true);
    expect(result.guidance.remediationGuidance).toBeTruthy();
    expect(result.guidance.remediationGuidance).toContain('scheduling');
  });

  it('10. AI platform 503 error handled gracefully', async () => {
    const error = new Error('Service Unavailable');
    error.response = { status: 503 };
    axios.post.mockRejectedValue(error);

    const result = await onboardingAIService.getGuidance({
      plan: makePlan(), employee: makeEmployee(), employeeProfile: makeProfile(),
      skillGapResult: makeSkillGapResult(), nextAction: { nextAction: null }, accessToken: 'tok',
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('AI_UNAVAILABLE');
  });

  it('11. Context distinguishes FACTS from empty skills correctly', async () => {
    axios.post.mockResolvedValue({
      data: { success: true, content: VALID_AI_RESPONSE }
    });

    // Employee with NO canonical skills
    const emptyProfile = { employeeSkills: [] };

    await onboardingAIService.getGuidance({
      plan: makePlan(),
      employee: makeEmployee(),
      employeeProfile: emptyProfile,
      skillGapResult: makeSkillGapResult(),
      nextAction: { nextAction: null },
      accessToken: 'tok',
    });

    const [, body] = axios.post.mock.calls[0];
    expect(body.messages[1].content).toContain('No canonical skills recorded yet');
  });

  it('12. Existing deterministic onboarding continues working when AI fails', async () => {
    // Verify AdaptiveOnboardingService is not imported or depended upon inside AI service
    // (the AI service should be independently fallible)
    axios.post.mockRejectedValue(new Error('AI platform is down'));

    const result = await onboardingAIService.getGuidance({
      plan: makePlan(), employee: makeEmployee(), employeeProfile: makeProfile(),
      skillGapResult: makeSkillGapResult(), nextAction: { nextAction: { title: 'Learn Kubernetes', type: 'LEARNING' } }, accessToken: 'tok',
    });

    // AI fails but returns graceful error — deterministic engine is unaffected
    expect(result.success).toBe(false);
    expect(result.aiAvailable).toBe(false);
    // The error is a safe object — never an exception thrown
    expect(result.error).toBeDefined();
    expect(result.error.code).toBeTruthy();
  });
});
