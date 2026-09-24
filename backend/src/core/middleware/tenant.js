import { TenantIsolationError } from '#@/core/errors/AppError.js';
import TenantContext from '#@/core/context/TenantContext.js';

/**
 * Tenant Isolation Guard Middleware (`requireTenant`)
 * Enforces zero-trust data boundaries by injecting req.user.organizationId into req.tenantContext.
 * Also runs the remainder of the request inside TenantContext (AsyncLocalStorage) as an architectural safety net.
 * Throws a fatal security exception if an authenticated request lacks organizationId.
 */
export const requireTenant = (req, res, next) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new TenantIsolationError('Fatal: Request missing organizationId context.');
    }

    req.tenantContext = {
      organizationId
    };

    TenantContext.run({
      organizationId,
      userId: req.user?.userId || req.user?._id || null,
      email: req.user?.email || null
    }, () => {
      next();
    });
  } catch (error) {
    next(error);
  }
};

export default requireTenant;
