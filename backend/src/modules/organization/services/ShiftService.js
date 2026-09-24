import logger from '#@/platform/logger/index.js';
import ShiftRepository from '../repositories/ShiftRepository.js';
import EVENTS from '#@/core/constants/events/index.js';
import AuditService from '#@/modules/audit/services/AuditService.js';
import EventBus from '#@/core/events/EventBus.js';
import { ValidationError, NotFoundError, ConflictError } from '#@/core/errors/AppError.js';

export class ShiftService {
  async createShift(payload, actor, organizationId, options = {}) {
    const { code, name, startTime, endTime, gracePeriodMinutes, isNightShift } = payload;

    const existingCode = await ShiftRepository.findByCode(code, organizationId, options);
    if (existingCode) throw new ConflictError(`A shift with code '${code}' already exists.`);

    const created = await ShiftRepository.createScoped({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      gracePeriodMinutes: gracePeriodMinutes || 15,
      isNightShift: isNightShift || false,
      status: 'ACTIVE'
    }, organizationId, options);

    await AuditService.logAction({
      organizationId,
      actorId: actor?.userId || null,
      action: 'CREATE_SHIFT',
      entityType: 'Shift',
      entityId: created._id,
      newValue: { code: created.code, name: created.name, startTime: created.startTime, endTime: created.endTime }
    }, options);

    logger.info({ organizationId, shiftId: created._id, code: created.code }, 'Created shift');
    EventBus.emit(EVENTS.SHIFT.CREATED, { organizationId, shiftId: created._id, code: created.code, name: created.name });
    return created;
  }

  async updateShift(id, payload, actor, organizationId, options = {}) {
    const shift = await ShiftRepository.findByIdAndTenant(id, organizationId, options);
    if (!shift) throw new NotFoundError('Shift not found.');
    if (shift.status === 'ARCHIVED') throw new ValidationError('Cannot update an archived shift.');

    if (payload.code && payload.code.trim().toUpperCase() !== shift.code) {
      const existingCode = await ShiftRepository.findByCode(payload.code, organizationId, options);
      if (existingCode && String(existingCode._id) !== String(id)) {
        throw new ConflictError(`A shift with code '${payload.code}' already exists.`);
      }
    }

    const updates = { ...payload };
    if (updates.code) updates.code = updates.code.trim().toUpperCase();

    const updated = await ShiftRepository.updateByIdAndTenant(id, updates, organizationId, options);

    await AuditService.logAction({
      organizationId,
      actorId: actor?.userId || null,
      action: 'UPDATE_SHIFT',
      entityType: 'Shift',
      entityId: id,
      previousValue: { code: shift.code, name: shift.name },
      newValue: { code: updated.code, name: updated.name }
    }, options);

    logger.info({ organizationId, shiftId: id }, 'Updated shift');
    EventBus.emit(EVENTS.SHIFT.UPDATED, { organizationId, shiftId: id, changes: { code: updated.code, name: updated.name } });
    return updated;
  }

  async archiveShift(id, reason, actor, organizationId, options = {}) {
    const shift = await ShiftRepository.findByIdAndTenant(id, organizationId, options);
    if (!shift) throw new NotFoundError('Shift not found.');
    if (shift.status === 'ARCHIVED') throw new ConflictError('Shift is already archived.');

    const archived = await ShiftRepository.updateByIdAndTenant(id, {
      status: 'ARCHIVED',
      archivedAt: new Date(),
      archivedBy: actor?.userId || null,
      archiveReason: reason?.trim() || null
    }, organizationId, options);

    await AuditService.logAction({
      organizationId,
      actorId: actor?.userId || null,
      action: 'ARCHIVE_SHIFT',
      entityType: 'Shift',
      entityId: id,
      previousValue: { status: 'ACTIVE' },
      newValue: { status: 'ARCHIVED', archiveReason: reason }
    }, options);

    logger.info({ organizationId, shiftId: id }, 'Archived shift');
    EventBus.emit(EVENTS.SHIFT.ARCHIVED, { organizationId, shiftId: id, archiveReason: reason });
    return archived;
  }

  async getShiftById(id, organizationId, options = {}) {
    const shift = await ShiftRepository.findByIdAndTenant(id, organizationId, options);
    if (!shift) throw new NotFoundError('Shift not found.');
    return shift;
  }

  async getShifts(filters, organizationId, options = {}) {
    return await ShiftRepository.findPaginated({
      filter: filters,
      page: options.page || 1,
      limit: options.limit || 20,
      sort: options.sort || { name: 1 }
    }, organizationId, options);
  }
}

export default new ShiftService();
