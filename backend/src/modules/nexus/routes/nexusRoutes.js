import { Router } from 'express';
import NexusProfileController from '../controllers/NexusProfileController.js';
import SkillIntelligenceController from '../controllers/SkillIntelligenceController.js';
import SkillGraphController from '../controllers/SkillGraphController.js';
import OnboardingPlanController from '../controllers/OnboardingPlanController.js';
import OnboardingAIController from '../controllers/OnboardingAIController.js';
import authenticate from '../../../core/middleware/auth.js';
import requireTenant from '../../../core/middleware/tenant.js';

const router = Router();

// Apply authentication and tenant isolation globally
router.use(authenticate, requireTenant);

// ---------------------------------------------------------------------------
// Employee Intelligence Profiles (Phase 1)
// ---------------------------------------------------------------------------

// GET /api/v1/nexus/employees/:id/profile
router.get('/employees/:id/profile', NexusProfileController.getProfile);

// PUT /api/v1/nexus/employees/:id/profile
router.put('/employees/:id/profile', NexusProfileController.updateProfile);

// POST /api/v1/nexus/employees/:id/skills
router.post('/employees/:id/skills', NexusProfileController.addSkill);

// PATCH /api/v1/nexus/employees/:id/skills/:skillId
router.patch('/employees/:id/skills/:skillId', NexusProfileController.updateSkill);

// DELETE /api/v1/nexus/employees/:id/skills/:skillId
router.delete('/employees/:id/skills/:skillId', NexusProfileController.removeSkill);

// GET /api/v1/nexus/samples/workforce (Sample Indian Engineering Workforce)
router.get('/samples/workforce', NexusProfileController.getSampleWorkforce);

// ---------------------------------------------------------------------------
// Skill Intelligence API (Phase 5C)
// ---------------------------------------------------------------------------

// POST /api/v1/nexus/skills/extract
router.post('/skills/extract', SkillIntelligenceController.extractSkills);

// POST /api/v1/nexus/employees/:employeeId/skill-analysis
router.post('/employees/:employeeId/skill-analysis', SkillIntelligenceController.analyzeEmployee);

// ---------------------------------------------------------------------------
// Skill Gap Engine (Phase 5D)
// ---------------------------------------------------------------------------

// GET /api/v1/nexus/employees/:employeeId/skill-gap
router.get('/employees/:employeeId/skill-gap', SkillIntelligenceController.analyzeSkillGap);

// GET /api/v1/nexus/employees/:employeeId/projects/:projectId/skill-gap
router.get('/employees/:employeeId/projects/:projectId/skill-gap', SkillIntelligenceController.analyzeSkillGap);

// ---------------------------------------------------------------------------
// Skill Graph API (Phase 6A)
// ---------------------------------------------------------------------------
router.get('/skill-graph', SkillGraphController.getGraph);

// ---------------------------------------------------------------------------
// Adaptive Onboarding (Phase 7A)
// ---------------------------------------------------------------------------

// POST /api/v1/nexus/employees/:employeeId/onboarding/plans/generate
router.post('/employees/:employeeId/onboarding/plans/generate', OnboardingPlanController.generatePlan);

// POST /api/v1/nexus/onboarding/plans
router.post('/onboarding/plans', OnboardingPlanController.createPlan);

// GET /api/v1/nexus/onboarding/plans/:planId
router.get('/onboarding/plans/:planId', OnboardingPlanController.getPlan);

// GET /api/v1/nexus/employees/:employeeId/onboarding/plans
router.get('/employees/:employeeId/onboarding/plans', OnboardingPlanController.listEmployeePlans);

// PATCH /api/v1/nexus/onboarding/plans/:planId/status
router.patch('/onboarding/plans/:planId/status', OnboardingPlanController.updatePlanStatus);

// GET /api/v1/nexus/onboarding/plans/:planId/next-action
router.get('/onboarding/plans/:planId/next-action', OnboardingPlanController.getNextAction);

// POST /api/v1/nexus/onboarding/plans/:planId/tasks/:taskId/complete
router.post('/onboarding/plans/:planId/tasks/:taskId/complete', OnboardingPlanController.completeTask);

// ---------------------------------------------------------------------------
// Adaptive Onboarding AI Personalization (Phase 7E)
// ---------------------------------------------------------------------------

// GET /api/v1/nexus/onboarding/plans/:planId/ai-guidance
router.get('/onboarding/plans/:planId/ai-guidance', OnboardingAIController.getPlanGuidance);

// GET /api/v1/nexus/onboarding/plans/:planId/tasks/:taskId/ai-guidance
router.get('/onboarding/plans/:planId/tasks/:taskId/ai-guidance', OnboardingAIController.getTaskGuidance);

export default router;
