import logger from '#@/platform/logger/index.js';
import cacheService from '#@/platform/cache/index.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';
import UserRoleRepository from '#@/modules/roles/repositories/UserRoleRepository.js';
import { ForbiddenError } from '#@/core/errors/AppError.js';

// Baseline System Permission Catalog (Atomic Capabilities)
export const SYSTEM_PERMISSIONS = [
  // Organization
  { namespace: 'org', action: 'manage', permission: PERMISSIONS.ORGANIZATION.MANAGE, description: 'Manage tenant settings, branding, and configurations' },
  // Users
  { namespace: 'user', action: 'create', permission: PERMISSIONS.USER.CREATE, description: 'Create new user profiles' },
  { namespace: 'user', action: 'read', permission: PERMISSIONS.USER.READ, description: 'View all user records across department' },
  { namespace: 'user', action: 'read_self', permission: PERMISSIONS.USER.READ_SELF, description: 'View own personal user record' },
  { namespace: 'user', action: 'update', permission: PERMISSIONS.USER.UPDATE, description: 'Update user details and compensation' },
  { namespace: 'user', action: 'delete', permission: PERMISSIONS.USER.DELETE, description: 'Terminate or archive user records' },
  // Attendance
  { namespace: 'attendance', action: 'mark', permission: PERMISSIONS.ATTENDANCE.MARK, description: 'Mark daily clock-in/out timestamps' },
  { namespace: 'attendance', action: 'approve', permission: PERMISSIONS.ATTENDANCE.APPROVE, description: 'Approve subordinate attendance regularizations and overtime' },
  // Leaves
  { namespace: 'leave', action: 'apply', permission: PERMISSIONS.LEAVE.REQUEST_SUBMIT, description: 'Submit leave applications' },
  { namespace: 'leave', action: 'approve', permission: PERMISSIONS.LEAVE.REQUEST_APPROVE, description: 'Approve or reject leave applications' },
  { namespace: 'leave', action: 'override', permission: PERMISSIONS.LEAVE.OVERRIDE, description: 'Override leave ledgers and balances' },
  // Payroll
  { namespace: 'payroll', action: 'run', permission: PERMISSIONS.PAYROLL.RUN, description: 'Execute monthly salary and tax calculations' },
  { namespace: 'payroll', action: 'lock', permission: PERMISSIONS.PAYROLL.LOCK, description: 'Lock payroll ledgers and generate payslips' },
  { namespace: 'payroll', action: 'view_salary', permission: PERMISSIONS.PAYROLL.VIEW_SALARY, description: 'View confidential salary basic and tax figures' },
  // Roles & RBAC
  { namespace: 'role', action: 'create', permission: PERMISSIONS.ROLE.CREATE, description: 'Create custom RBAC roles' },
  { namespace: 'role', action: 'read', permission: PERMISSIONS.ROLE.READ, description: 'View tenant roles and permission mappings' },
  { namespace: 'role', action: 'update', permission: PERMISSIONS.ROLE.UPDATE, description: 'Edit custom role permissions and priority' },
  { namespace: 'role', action: 'delete', permission: PERMISSIONS.ROLE.DELETE, description: 'Archive or delete custom roles' },
  { namespace: 'role', action: 'assign', permission: PERMISSIONS.ROLE.ASSIGN, description: 'Assign roles to users' },
  // Invitations
  { namespace: 'invite', action: 'create', permission: PERMISSIONS.INVITE.CREATE, description: 'Generate cryptographic onboarding invitation links' },
  { namespace: 'invite', action: 'revoke', permission: PERMISSIONS.INVITE.REVOKE, description: 'Revoke pending invitations' },
  // AI Co-Pilot & Tools
  { namespace: 'ai', action: 'use', permission: PERMISSIONS.AI.USE, description: 'Access conversational AI Co-Pilot interface' },
  { namespace: 'ai', action: 'execute_tool', permission: PERMISSIONS.AI.EXECUTE_TOOL, description: 'Authorize AI to execute backend operational tools' },
  { namespace: 'ai', action: 'admin', permission: PERMISSIONS.AI.ADMIN, description: 'View AI token consumption, latency, and cost dashboards' }
];

export class RbacService {
  /**
   * Returns the complete baseline catalog of atomic permissions.
   */
  getSystemPermissionCatalog() {
    return SYSTEM_PERMISSIONS;
  }

  /**
   * Computes the union of effective permission strings for a user within a tenant.
   * Leverages CacheService caching (1-hour TTL) and embedded permissions array inside Role documents.
   * Decoupled from role priority or role names: authorization is strictly determined by permission strings or wildcard '*'.
   * @param {string} userId 
   * @param {string} organizationId 
   * @returns {Promise<Set<string>>} Set of permission strings
   */
  async getEffectivePermissions(userId, organizationId) {
    const cacheKey = `tenant:${organizationId}:user:${userId}:permissions`;

    const cachedPerms = await cacheService.get(cacheKey);
    if (cachedPerms) {
      const parsed = typeof cachedPerms === 'string' ? JSON.parse(cachedPerms) : cachedPerms;
      return new Set(parsed);
    }

    logger.debug({ userId, organizationId }, 'Cache miss: Computing effective RBAC permissions from database');

    // 2. Query UserRole join table, populating the assigned Role document
    const userRoles = await UserRoleRepository.findRolesByUser(userId, organizationId);
    if (!userRoles || userRoles.length === 0) {
      return new Set();
    }

    const effectiveSet = new Set();
    let isSuperAdmin = false;

    // 3. Aggregate permissions strictly from active assigned roles
    for (const ur of userRoles) {
      const role = ur.roleId;
      if (!role || role.status !== 'ACTIVE') continue;

      if (role.permissions && role.permissions.includes('*')) {
        isSuperAdmin = true;
        break;
      }

      if (Array.isArray(role.permissions)) {
        role.permissions.forEach(perm => effectiveSet.add(perm));
      }
    }

    if (isSuperAdmin) {
      effectiveSet.clear();
      effectiveSet.add('*');
    }

    // 4. Cache resolved permission array via CacheService
    const permArray = Array.from(effectiveSet);
    await cacheService.set(cacheKey, JSON.stringify(permArray), 3600);

    logger.info({ userId, permCount: effectiveSet.size, isSuperAdmin }, 'Computed and cached effective RBAC permissions');
    return effectiveSet;
  }

  /**
   * Verifies if a user possesses a specific atomic permission. Throws ForbiddenError if denied.
   * @param {string} userId 
   * @param {string} organizationId 
   * @param {string} requiredPermission 
   */
  async enforcePermission(userId, organizationId, requiredPermission) {
    const permissions = await this.getEffectivePermissions(userId, organizationId);

    const hasAccess = permissions.has('*') || permissions.has(requiredPermission);
    if (!hasAccess) {
      logger.warn({ userId, organizationId, requiredPermission }, 'RBAC authorization check failed');
      throw new ForbiddenError(`Access denied: Required permission [${requiredPermission}] is missing.`);
    }
    return true;
  }

  /**
   * Invalidates a user's permission cache in CacheService.
   * Called automatically when roles or role assignments are updated.
   */
  async invalidateUserCache(userId, organizationId) {
    const cacheKey = `tenant:${organizationId}:user:${userId}:permissions`;
    await cacheService.delete(cacheKey);
    logger.debug({ userId, organizationId }, 'Invalidated user RBAC permission cache');
  }

  /**
   * Invalidates caches for all users holding a specific role.
   */
  async invalidateRoleUsersCache(roleId, organizationId) {
    const userRoles = await UserRoleRepository.findUsersByRole(roleId, organizationId);
    for (const ur of userRoles) {
      const uId = ur.userId?._id || ur.userId;
      await this.invalidateUserCache(uId, organizationId);
    }
  }
}

export default new RbacService();
