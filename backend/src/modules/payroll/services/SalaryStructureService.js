import SalaryStructureRepository from '../repositories/SalaryStructureRepository.js';
import SalaryRevisionRepository from '../repositories/SalaryRevisionRepository.js';
import { AppError } from '#@/core/errors/AppError.js';
import logger from '#@/platform/logger/index.js';
import EventBus from '#@/core/events/EventBus.js';
import PAYROLL_EVENTS from '#@/core/constants/events/payroll.js';

export class SalaryStructureService {
  constructor(
    structureRepo = new SalaryStructureRepository(),
    revisionRepo = new SalaryRevisionRepository()
  ) {
    this.structureRepo = structureRepo;
    this.revisionRepo = revisionRepo;
  }

  /**
   * Hierarchically resolves the active salary structure for an employee.
   * Precedence: Employee Override ➔ Designation ➔ Department ➔ Organization Default
   */
  async resolveForEmployee(employee, organizationId, options = {}) {
    if (!employee || !employee._id) {
      throw new AppError('Invalid employee passed to salary structure resolver', 400);
    }

    const { _id: employeeId, designationId, departmentId } = employee;

    // 1. Employee Override
    let structure = await this.structureRepo.findActiveByEmployee(employeeId, organizationId, options);
    if (structure) {
      logger.debug({ employeeId, structureId: structure._id }, 'Resolved structure via Employee Override');
      return structure;
    }

    // 2. Designation
    if (designationId) {
      structure = await this.structureRepo.findActiveByDesignation(designationId, organizationId, options);
      if (structure) {
        logger.debug({ employeeId, designationId, structureId: structure._id }, 'Resolved structure via Designation');
        return structure;
      }
    }

    // 3. Department
    if (departmentId) {
      structure = await this.structureRepo.findActiveByDepartment(departmentId, organizationId, options);
      if (structure) {
        logger.debug({ employeeId, departmentId, structureId: structure._id }, 'Resolved structure via Department');
        return structure;
      }
    }

    // 4. Organization Default
    structure = await this.structureRepo.findActiveDefault(organizationId, options);
    if (structure) {
      logger.debug({ employeeId, structureId: structure._id }, 'Resolved structure via Organization Default');
      return structure;
    }

    logger.warn({ employeeId, organizationId }, 'No applicable active salary structure found for employee');
    return null;
  }

  /**
   * Creates a new versioned salary structure and archives any existing active structure at the same hierarchical level.
   */
  async createStructure({
    employeeId = null,
    designationId = null,
    departmentId = null,
    currency = 'USD',
    baseSalary,
    components = [],
    reason = 'INITIAL_SETTING',
    effectiveFrom = new Date()
  }, actorId, organizationId, options = {}) {
    if (baseSalary === undefined || baseSalary === null || baseSalary < 0) {
      throw new AppError('Base salary is required and must be non-negative', 400);
    }

    let targetId;
    let targetType;
    let filter = { employeeId, designationId, departmentId };

    if (employeeId) {
      targetId = employeeId;
      targetType = 'EMPLOYEE';
    } else if (designationId) {
      targetId = designationId;
      targetType = 'DESIGNATION';
    } else if (departmentId) {
      targetId = departmentId;
      targetType = 'DEPARTMENT';
    } else {
      targetId = organizationId;
      targetType = 'ORGANIZATION';
    }

    // Find existing active structure at exact target level
    const existingActive = await this.structureRepo.findOne({
      ...filter,
      status: 'ACTIVE'
    }, organizationId, options);

    if (existingActive) {
      await this.structureRepo.supersedeStructure(existingActive._id, organizationId, new Date(effectiveFrom), options);
      logger.info({ structureId: existingActive._id, targetType, targetId }, 'Superseded old salary structure');
    }

    const nextVersion = await this.structureRepo.getNextVersion(organizationId, filter, options);

    const newStructure = await this.structureRepo.createScoped({
      version: nextVersion,
      effectiveFrom,
      effectiveTo: null,
      status: 'ACTIVE',
      employeeId,
      designationId,
      departmentId,
      currency,
      baseSalary,
      components
    }, organizationId, options);

    const revision = await this.revisionRepo.createScoped({
      targetId,
      targetType,
      salaryStructureId: newStructure._id,
      reason,
      approvedBy: actorId,
      timestamp: new Date()
    }, organizationId, options);

    // Broadcast domain events safely
    try {
      EventBus.emit(PAYROLL_EVENTS.STRUCTURE_CREATED, {
        organizationId,
        structureId: newStructure._id,
        version: newStructure.version,
        targetType,
        targetId
      });
      EventBus.emit(PAYROLL_EVENTS.REVISION_CREATED, {
        organizationId,
        revisionId: revision._id,
        targetType,
        targetId,
        reason
      });
    } catch (err) {
      logger.error({ err }, 'Failed to emit salary structure events');
    }

    return { structure: newStructure, revision };
  }
}

export default new SalaryStructureService();
