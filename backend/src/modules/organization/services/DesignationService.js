import logger from '#@/platform/logger/index.js';
import DesignationRepository from '../repositories/DesignationRepository.js';
import EVENTS from '#@/core/constants/events/index.js';
import AuditService from '#@/modules/audit/services/AuditService.js';
import EventBus from '#@/core/events/EventBus.js';
import { ValidationError, NotFoundError, ConflictError } from '#@/core/errors/AppError.js';

export class DesignationService {
  async createDesignation(payload, actor, organizationId, options = {}) {
    const { code, title, description, salaryGrade, payBand, defaultDepartmentId } = payload;

    const existingCode = await DesignationRepository.findByCode(code, organizationId, options);
    if (existingCode) {
      throw new ConflictError(`A designation with code '${code}' already exists.`);
    }

    const created = await DesignationRepository.createScoped({
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description?.trim() || '',
      salaryGrade: salaryGrade?.trim() || '',
      payBand: payBand || { min: 0, max: 0 },
      defaultDepartmentId: defaultDepartmentId || null,
      status: 'ACTIVE'
    }, organizationId, options);

    await AuditService.logAction({
      organizationId,
      actorId: actor?.userId || null,
      action: 'CREATE_DESIGNATION',
      entityType: 'Designation',
      entityId: created._id,
      newValue: { code: created.code, title: created.title, payBand: created.payBand }
    }, options);

    logger.info({ organizationId, designationId: created._id, code: created.code }, 'Created designation');
    EventBus.emit(EVENTS.DESIGNATION.CREATED, { organizationId, designationId: created._id, code: created.code, title: created.title });
    return created;
  }

  async updateDesignation(id, payload, actor, organizationId, options = {}) {
    const designation = await DesignationRepository.findByIdAndTenant(id, organizationId, options);
    if (!designation) throw new NotFoundError('Designation not found.');
    if (designation.status === 'ARCHIVED') throw new ValidationError('Cannot update an archived designation.');

    if (payload.code && payload.code.trim().toUpperCase() !== designation.code) {
      const existingCode = await DesignationRepository.findByCode(payload.code, organizationId, options);
      if (existingCode && String(existingCode._id) !== String(id)) {
        throw new ConflictError(`A designation with code '${payload.code}' already exists.`);
      }
    }

    const updates = { ...payload };
    if (updates.code) updates.code = updates.code.trim().toUpperCase();

    const updated = await DesignationRepository.updateByIdAndTenant(id, updates, organizationId, options);

    await AuditService.logAction({
      organizationId,
      actorId: actor?.userId || null,
      action: 'UPDATE_DESIGNATION',
      entityType: 'Designation',
      entityId: id,
      previousValue: { code: designation.code, title: designation.title },
      newValue: { code: updated.code, title: updated.title }
    }, options);

    logger.info({ organizationId, designationId: id }, 'Updated designation');
    EventBus.emit(EVENTS.DESIGNATION.UPDATED, { organizationId, designationId: id, changes: { code: updated.code, title: updated.title } });
    return updated;
  }

  async archiveDesignation(id, reason, actor, organizationId, options = {}) {
    const designation = await DesignationRepository.findByIdAndTenant(id, organizationId, options);
    if (!designation) throw new NotFoundError('Designation not found.');
    if (designation.status === 'ARCHIVED') throw new ConflictError('Designation is already archived.');

    const archived = await DesignationRepository.updateByIdAndTenant(id, {
      status: 'ARCHIVED',
      archivedAt: new Date(),
      archivedBy: actor?.userId || null,
      archiveReason: reason?.trim() || null
    }, organizationId, options);

    await AuditService.logAction({
      organizationId,
      actorId: actor?.userId || null,
      action: 'ARCHIVE_DESIGNATION',
      entityType: 'Designation',
      entityId: id,
      previousValue: { status: 'ACTIVE' },
      newValue: { status: 'ARCHIVED', archiveReason: reason }
    }, options);

    logger.info({ organizationId, designationId: id }, 'Archived designation');
    EventBus.emit(EVENTS.DESIGNATION.ARCHIVED, { organizationId, designationId: id, archiveReason: reason });
    return archived;
  }

  async getDesignationById(id, organizationId, options = {}) {
    const designation = await DesignationRepository.findByIdAndTenant(id, organizationId, options);
    if (!designation) throw new NotFoundError('Designation not found.');
    return designation;
  }

  async getDesignations(filters, organizationId, options = {}) {
    return await DesignationRepository.findPaginated({
      filter: filters,
      page: options.page || 1,
      limit: options.limit || 20,
      sort: options.sort || { title: 1 }
    }, organizationId, options);
  }
}

export default new DesignationService();
