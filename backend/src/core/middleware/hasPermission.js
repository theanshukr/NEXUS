import RbacService from '#@/modules/roles/services/RbacService.js';
import { ForbiddenError } from '#@/core/errors/AppError.js';

/**
 * Middleware Factory: Enforces dynamic RBAC atomic permissions.
 * Never checks role names directly; evaluates effective permission strings.
 * 
 * Example usage in routes:
 *   router.post('/', authenticate, requireTenant, hasPermission('user.create'), UserController.create);
 * 
 * @param {string} requiredPermission Atomic capability string (e.g., 'user.create')
 */
export const hasPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const { userId, organizationId } = req.user || {};
      if (!userId || !organizationId) {
        throw new ForbiddenError('Security context missing from authenticated request.');
      }

      await RbacService.enforcePermission(userId, organizationId, requiredPermission);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Checks if the user possesses AT LEAST ONE permission from the provided array.
 * @param {string[]} permissionsArray 
 */
export const hasAnyPermission = (permissionsArray) => {
  return async (req, res, next) => {
    try {
      const { userId, organizationId } = req.user || {};
      if (!userId || !organizationId) {
        throw new ForbiddenError('Security context missing from authenticated request.');
      }

      const effectivePerms = await RbacService.getEffectivePermissions(userId, organizationId);
      if (effectivePerms.has('*')) return next();

      const hasAny = permissionsArray.some(perm => effectivePerms.has(perm));
      if (!hasAny) {
        throw new ForbiddenError(`Access denied: Required at least one of [${permissionsArray.join(', ')}].`);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Checks if the user possesses ALL permissions from the provided array.
 * @param {string[]} permissionsArray 
 */
export const hasAllPermissions = (permissionsArray) => {
  return async (req, res, next) => {
    try {
      const { userId, organizationId } = req.user || {};
      if (!userId || !organizationId) {
        throw new ForbiddenError('Security context missing from authenticated request.');
      }

      const effectivePerms = await RbacService.getEffectivePermissions(userId, organizationId);
      if (effectivePerms.has('*')) return next();

      for (const perm of permissionsArray) {
        if (!effectivePerms.has(perm)) {
          throw new ForbiddenError(`Access denied: Missing required permission [${perm}].`);
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default hasPermission;
