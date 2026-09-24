import OrganizationBootstrapRegistry from '#@/core/bootstrap/OrganizationBootstrapRegistry.js';
import DepartmentRepository from '../repositories/DepartmentRepository.js';
import logger from '#@/platform/logger/index.js';

export class DepartmentBootstrapService {
  /**
   * Seed default General Administration department for a newly provisioned tenant organization.
   * @param {Object} payload - Event payload containing { organizationId, adminUserId, ... }
   * @param {Object} options - Transaction options { session }
   */
  async seedDefaultDepartment(payload, options = {}) {
    const { organizationId } = payload;
    if (!organizationId) {
      logger.warn('DepartmentBootstrapService invoked without organizationId');
      return null;
    }

    const existing = await DepartmentRepository.findByCode('GEN', organizationId, options);
    if (existing) {
      logger.info({ organizationId, code: 'GEN' }, 'Default General Administration department already exists');
      return existing;
    }

    const created = await DepartmentRepository.createScoped({
      code: 'GEN',
      name: 'General Administration',
      description: 'Default system department for general administration.',
      parentDepartmentId: null,
      ancestors: [],
      level: 0,
      cachedEmployeeCount: 0,
      status: 'ACTIVE'
    }, organizationId, options);

    logger.info({ organizationId, departmentId: created._id }, 'Seeded default General Administration department');
    return created;
  }
}

const departmentBootstrapService = new DepartmentBootstrapService();

OrganizationBootstrapRegistry.register(
  'DepartmentBootstrapService',
  (payload, options) => departmentBootstrapService.seedDefaultDepartment(payload, options),
  10
);

export default departmentBootstrapService;
