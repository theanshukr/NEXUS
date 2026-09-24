import LeavePolicyRepository from '../repositories/LeavePolicyRepository.js';
import { runInTransaction } from '#@/platform/database/db.js';
import CacheService from '#@/platform/cache/index.js';
import { ConflictError, NotFoundError } from '#@/core/errors/AppError.js';
import AuditService from '#@/modules/audit/services/AuditService.js';

class LeavePolicyService {
  async _invalidateCache(organizationId) {
    await CacheService.delete(`leavePolicies:${organizationId}`);
  }

  async getActivePolicies(organizationId) {
    const cacheKey = `leavePolicies:${organizationId}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const policies = await LeavePolicyRepository.findActivePolicies(organizationId);
    await CacheService.set(cacheKey, policies, 24 * 60 * 60);
    return policies;
  }

  async createInitialPolicy(organizationId, payload, actorId) {
    const existing = await LeavePolicyRepository.findActiveByCode(organizationId, payload.code);
    if (existing) {
      throw new ConflictError(`Active policy for code ${payload.code} already exists.`);
    }

    const policy = await LeavePolicyRepository.createScoped({
      ...payload,
      version: 1,
      effectiveFrom: new Date(),
      isActive: true
    }, organizationId);

    await AuditService.logAction({
      organizationId,
      actorId: actorId || organizationId, // system actor fallback
      action: 'LEAVE_POLICY_CREATED',
      entityType: 'LeavePolicy',
      entityId: policy._id,
      newValue: { code: policy.code, version: 1 }
    });

    await this._invalidateCache(organizationId);
    return policy;
  }

  /**
   * Versioned update. Archives N and creates N+1.
   */
  async updatePolicy(organizationId, code, payload, actorId) {
    return await runInTransaction(async (session) => {
      const currentPolicy = await LeavePolicyRepository.findActiveByCode(organizationId, code);
      if (!currentPolicy) {
        throw new NotFoundError(`No active policy found for code ${code}`);
      }

      // Archive current
      await LeavePolicyRepository.archivePolicy(organizationId, currentPolicy._id, session);

      // Create new version
      const newVersion = currentPolicy.version + 1;
      const newPolicy = await LeavePolicyRepository.createScoped({
        ...payload,
        name: payload.name || currentPolicy.name,
        code,
        version: newVersion,
        effectiveFrom: new Date(),
        isActive: true,
        annualAllowance: payload.annualAllowance ?? currentPolicy.annualAllowance,
        accrualFrequency: payload.accrualFrequency ?? currentPolicy.accrualFrequency,
        accrualRate: payload.accrualRate ?? currentPolicy.accrualRate,
        maxCarryForward: payload.maxCarryForward ?? currentPolicy.maxCarryForward,
        isEncashable: payload.isEncashable ?? currentPolicy.isEncashable,
        escalationRules: {
          ...currentPolicy.escalationRules,
          ...payload.escalationRules
        }
      }, organizationId, { session });

      await AuditService.logAction({
        organizationId,
        actorId,
        action: 'LEAVE_POLICY_UPDATED',
        entityType: 'LeavePolicy',
        entityId: newPolicy._id,
        oldValue: { version: currentPolicy.version, id: currentPolicy._id },
        newValue: { version: newVersion, id: newPolicy._id },
        session
      });

      return newPolicy;
    }).then(async (newPolicy) => {
      await this._invalidateCache(organizationId);
      return newPolicy;
    });
  }
}

export default new LeavePolicyService();
