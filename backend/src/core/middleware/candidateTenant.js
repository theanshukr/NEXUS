import { TenantIsolationError } from '#@/core/errors/AppError.js';
import TenantContext from '#@/core/context/TenantContext.js';
import organizationRepository from '#@/modules/organization/repositories/OrganizationRepository.js';
import cacheService from '#@/platform/cache/index.js';

/**
 * Candidate Tenant Isolation Guard Middleware (`candidateRequireTenant`)
 * Resolves the organizationId from the URL slug (e.g. req.params.slug)
 * and enforces tenant isolation.
 */
export const candidateRequireTenant = async (req, res, next) => {
  try {
    const slug = req.params.slug;
    if (!slug) {
      throw new TenantIsolationError('Missing organization slug in public route.');
    }

    // 1. Resolve slug to organizationId (use cache for performance)
    const cacheKey = `orgSlug:${slug.toUpperCase()}`;
    let organizationId = await cacheService.get(cacheKey);

    if (!organizationId) {
      const org = await organizationRepository.findByCode(slug);
      if (!org || org.status !== 'ACTIVE') {
        throw new TenantIsolationError('Organization not found or inactive.', 404);
      }
      organizationId = org._id.toString();
      // Cache for 1 hour to reduce DB hits on public routes
      await cacheService.set(cacheKey, organizationId, 3600);
    }

    // 2. If authenticated candidate exists, ensure their token matches the requested organization
    if (req.candidate) {
      if (req.candidate.organizationId !== organizationId) {
        throw new TenantIsolationError('Candidate token does not match the requested organization.', 403);
      }
    }

    // 3. Inject context
    req.tenantContext = {
      organizationId
    };

    TenantContext.run({
      organizationId,
      candidateId: req.candidate?.candidateId || null,
      email: req.candidate?.email || null
    }, () => {
      next();
    });
  } catch (error) {
    next(error);
  }
};

export default candidateRequireTenant;
