import logger from '#@/platform/logger/index.js';
import cacheService from '#@/platform/cache/index.js';
import RoleDelegationRepository from '#@/modules/roles/repositories/RoleDelegationRepository.js';
import RoleRepository from '#@/modules/roles/repositories/RoleRepository.js';
import UserRoleRepository from '#@/modules/roles/repositories/UserRoleRepository.js';
import RbacService from '#@/modules/roles/services/RbacService.js';
import AuditService from '#@/modules/audit/services/AuditService.js';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from '#@/core/errors/AppError.js';

export class RoleDelegationService {
  /**
   * Retrieves array of target role ID strings that a source role is allowed to delegate.
   * Utilizes Redis cache with fallback to database.
   */
  async getAllowedTargetRoleIds(sourceRoleId, organizationId) {
    const mainKey = `roleDelegation:${organizationId}:${sourceRoleId}`;
    const cached = await cacheService.get(mainKey);
    if (cached && Array.isArray(cached)) {
      return cached;
    }

    const policies = await RoleDelegationRepository.findBySourceRole(sourceRoleId, organizationId);
    const targetIds = policies.map(p => p.targetRoleId?._id ? p.targetRoleId._id.toString() : p.targetRoleId.toString());

    await cacheService.set(mainKey, targetIds, 3600);
    const aliasKey = `roleAssignment:${organizationId}:${sourceRoleId}`;
    await cacheService.set(aliasKey, targetIds, 3600);

    return targetIds;
  }

  /**
   * Evaluates Role Assignment Policy: Checks if actor is authorized to assign ALL specified target roles.
   * Users holding wildcard '*' permission in RBAC bypass this policy check.
   */
  async canAssignRoles(actorContext, targetRoleIds) {
    const { userId: actorId, organizationId } = actorContext;
    if (!actorId || !organizationId || !targetRoleIds || targetRoleIds.length === 0) {
      return false;
    }

    // 1. Check wildcard RBAC bypass (Super Admin / Organization Owner)
    const actorPerms = await RbacService.getEffectivePermissions(actorId, organizationId);
    if (actorPerms.has('*')) {
      return true;
    }

    // 2. Get all roles assigned to actor
    const userRoles = await UserRoleRepository.findRolesByUser(actorId, organizationId);
    if (!userRoles || userRoles.length === 0) {
      return false;
    }

    // 3. Collect union of all target role IDs allowable across all source roles held by actor
    const allowedTargetIds = new Set();
    for (const ur of userRoles) {
      const sourceRoleId = ur.roleId?._id ? ur.roleId._id.toString() : ur.roleId.toString();
      const targetIds = await this.getAllowedTargetRoleIds(sourceRoleId, organizationId);
      targetIds.forEach(id => allowedTargetIds.add(id));
    }

    // 4. Verify every requested role ID is authorized
    return targetRoleIds.every(roleId => {
      const idStr = roleId?._id ? roleId._id.toString() : roleId.toString();
      return allowedTargetIds.has(idStr);
    });
  }

  /**
   * Retrieves role delegation policies for a tenant.
   */
  async getPolicies(organizationId, filter = {}) {
    return await RoleDelegationRepository.find(filter, organizationId, {
      populate: ['sourceRoleId', 'targetRoleId'],
      sort: { createdAt: -1 }
    });
  }

  /**
   * Creates a new role delegation policy rule.
   */
  async createPolicy(data, actorContext) {
    const { sourceRoleId, targetRoleId } = data;
    const { userId: actorId, organizationId } = actorContext;

    const [sourceRole, targetRole] = await Promise.all([
      RoleRepository.findByIdAndTenant(sourceRoleId, organizationId),
      RoleRepository.findByIdAndTenant(targetRoleId, organizationId)
    ]);

    if (!sourceRole || !targetRole) {
      throw new ValidationError('Both sourceRoleId and targetRoleId must reference existing active roles in this organization.');
    }

    const existing = await RoleDelegationRepository.findBySourceAndTarget(sourceRoleId, targetRoleId, organizationId);
    if (existing) {
      throw new ConflictError('A delegation policy for this source and target role already exists.');
    }

    const policy = await RoleDelegationRepository.createScoped({
      sourceRoleId,
      targetRoleId,
      createdBy: actorId
    }, organizationId);

    await this.invalidateCache(organizationId, sourceRoleId);

    await AuditService.logAction({
      organizationId,
      actorId,
      action: 'POLICY_CREATED',
      entityType: 'RoleDelegationPolicy',
      entityId: policy._id,
      details: { sourceRoleId, targetRoleId, sourceRoleName: sourceRole.name, targetRoleName: targetRole.name }
    });

    logger.info({ policyId: policy._id, organizationId, sourceRoleId, targetRoleId }, 'Created RoleDelegationPolicy rule');
    return policy;
  }

  /**
   * Updates an existing delegation policy.
   */
  async updatePolicy(policyId, updateData, actorContext) {
    const { userId: actorId, organizationId } = actorContext;
    const policy = await RoleDelegationRepository.findByIdAndTenant(policyId, organizationId);
    if (!policy) {
      throw new NotFoundError('Role delegation policy not found.');
    }

    const oldSourceRoleId = policy.sourceRoleId?._id ? policy.sourceRoleId._id.toString() : policy.sourceRoleId.toString();
    if (updateData.sourceRoleId) policy.sourceRoleId = updateData.sourceRoleId;
    if (updateData.targetRoleId) policy.targetRoleId = updateData.targetRoleId;

    const updated = await RoleDelegationRepository.updateByIdAndTenant(policyId, policy, organizationId);

    await this.invalidateCache(organizationId, oldSourceRoleId);
    if (updateData.sourceRoleId && updateData.sourceRoleId.toString() !== oldSourceRoleId) {
      await this.invalidateCache(organizationId, updateData.sourceRoleId);
    }

    await AuditService.logAction({
      organizationId,
      actorId,
      action: 'POLICY_UPDATED',
      entityType: 'RoleDelegationPolicy',
      entityId: policyId,
      details: { updateData }
    });

    return updated;
  }

  /**
   * Deletes a delegation policy rule.
   */
  async deletePolicy(policyId, actorContext) {
    const { userId: actorId, organizationId } = actorContext;
    const policy = await RoleDelegationRepository.findByIdAndTenant(policyId, organizationId);
    if (!policy) {
      throw new NotFoundError('Role delegation policy not found.');
    }

    const sourceRoleId = policy.sourceRoleId?._id ? policy.sourceRoleId._id.toString() : policy.sourceRoleId.toString();
    await RoleDelegationRepository.deleteByIdAndTenant(policyId, organizationId);

    await this.invalidateCache(organizationId, sourceRoleId);

    await AuditService.logAction({
      organizationId,
      actorId,
      action: 'POLICY_DELETED',
      entityType: 'RoleDelegationPolicy',
      entityId: policyId,
      details: { sourceRoleId, targetRoleId: policy.targetRoleId }
    });

    logger.info({ policyId, organizationId, sourceRoleId }, 'Deleted RoleDelegationPolicy rule');
    return { id: policyId, deleted: true };
  }

  /**
   * Invalidates Redis caches for a specific source role.
   */
  async invalidateCache(organizationId, roleId) {
    const mainKey = `roleDelegation:${organizationId}:${roleId}`;
    const aliasKey = `roleAssignment:${organizationId}:${roleId}`;
    await cacheService.delete(mainKey);
    await cacheService.delete(aliasKey);
    logger.debug({ organizationId, roleId }, 'Invalidated RoleDelegationPolicy cache');
  }

  /**
   * Invalidates cache when a role is modified or archived.
   */
  async invalidateAllForRole(organizationId, roleId) {
    await this.invalidateCache(organizationId, roleId);
    const policies = await RoleDelegationRepository.findByTargetRole(roleId, organizationId);
    for (const p of policies) {
      const sId = p.sourceRoleId?._id ? p.sourceRoleId._id.toString() : p.sourceRoleId.toString();
      await this.invalidateCache(organizationId, sId);
    }
  }

  /**
   * Seeds default enterprise role assignment policies during tenant provisioning.
   */
  async seedDefaultPolicies(organizationId, systemRoles, options = {}) {
    const byName = {};
    for (const r of systemRoles) {
      byName[r.name] = r;
    }

    const policiesToSeed = [];

    // 1. Super Admin -> All Roles
    if (byName['Super Admin']) {
      for (const r of systemRoles) {
        policiesToSeed.push({ sourceRoleId: byName['Super Admin']._id, targetRoleId: r._id });
      }
    }

    // 2. Administrator -> Manager, Employee, Intern
    if (byName['Administrator']) {
      const targets = [byName['Department Manager'], byName['Standard Employee'], byName['Intern']].filter(Boolean);
      for (const t of targets) {
        policiesToSeed.push({ sourceRoleId: byName['Administrator']._id, targetRoleId: t._id });
      }
    }

    // 3. Manager -> Employee, Intern
    if (byName['Department Manager']) {
      const targets = [byName['Standard Employee'], byName['Intern']].filter(Boolean);
      for (const t of targets) {
        policiesToSeed.push({ sourceRoleId: byName['Department Manager']._id, targetRoleId: t._id });
      }
    }

    // 4. HR -> Employee, Intern
    if (byName['HR Manager']) {
      const targets = [byName['Standard Employee'], byName['Intern']].filter(Boolean);
      for (const t of targets) {
        policiesToSeed.push({ sourceRoleId: byName['HR Manager']._id, targetRoleId: t._id });
      }
    }

    if (policiesToSeed.length > 0) {
      await RoleDelegationRepository.createManyScoped(policiesToSeed, organizationId, options);
      logger.info({ organizationId, seededCount: policiesToSeed.length }, 'Seeded default RoleDelegationPolicy rules');
    }

    return policiesToSeed;
  }
}

const serviceInstance = new RoleDelegationService();
export default serviceInstance;
export const RoleAssignmentService = serviceInstance;
