import logger from '#@/platform/logger/index.js';
import LocationRepository from '../repositories/LocationRepository.js';
import EVENTS from '#@/core/constants/events/index.js';
import AuditService from '#@/modules/audit/services/AuditService.js';
import EventBus from '#@/core/events/EventBus.js';
import HolidayCalendarRepository from '../repositories/HolidayCalendarRepository.js';
import { ValidationError, NotFoundError, ConflictError } from '#@/core/errors/AppError.js';

export class LocationService {
  async createLocation(payload, actor, organizationId, options = {}) {
    const { code, name, address, coordinates, geofenceRadiusMeters, timezone } = payload;

    const existingCode = await LocationRepository.findByCode(code, organizationId, options);
    if (existingCode) throw new ConflictError(`A location with code '${code}' already exists.`);

    const created = await LocationRepository.createScoped({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      address: address.trim(),
      coordinates: coordinates || { latitude: null, longitude: null },
      geofenceRadiusMeters: geofenceRadiusMeters || 50,
      timezone: timezone.trim(),
      status: 'ACTIVE'
    }, organizationId, options);

    await AuditService.logAction({
      organizationId,
      actorId: actor?.userId || null,
      action: 'CREATE_LOCATION',
      entityType: 'Location',
      entityId: created._id,
      newValue: { code: created.code, name: created.name }
    }, options);

    logger.info({ organizationId, locationId: created._id, code: created.code }, 'Created location');
    EventBus.emit(EVENTS.LOCATION.CREATED, { organizationId, locationId: created._id, code: created.code, name: created.name });
    return created;
  }

  async updateLocation(id, payload, actor, organizationId, options = {}) {
    const location = await LocationRepository.findByIdAndTenant(id, organizationId, options);
    if (!location) throw new NotFoundError('Location not found.');
    if (location.status === 'ARCHIVED') throw new ValidationError('Cannot update an archived location.');

    if (payload.code && payload.code.trim().toUpperCase() !== location.code) {
      const existingCode = await LocationRepository.findByCode(payload.code, organizationId, options);
      if (existingCode && String(existingCode._id) !== String(id)) {
        throw new ConflictError(`A location with code '${payload.code}' already exists.`);
      }
    }

    const updates = { ...payload };
    if (updates.code) updates.code = updates.code.trim().toUpperCase();

    const updated = await LocationRepository.updateByIdAndTenant(id, updates, organizationId, options);

    await AuditService.logAction({
      organizationId,
      actorId: actor?.userId || null,
      action: 'UPDATE_LOCATION',
      entityType: 'Location',
      entityId: id,
      previousValue: { code: location.code, name: location.name },
      newValue: { code: updated.code, name: updated.name }
    }, options);

    logger.info({ organizationId, locationId: id }, 'Updated location');
    EventBus.emit(EVENTS.LOCATION.UPDATED, { organizationId, locationId: id, changes: { code: updated.code, name: updated.name } });
    return updated;
  }

  async archiveLocation(id, reason, actor, organizationId, options = {}) {
    const location = await LocationRepository.findByIdAndTenant(id, organizationId, options);
    if (!location) throw new NotFoundError('Location not found.');
    if (location.status === 'ARCHIVED') throw new ConflictError('Location is already archived.');

    const currentYear = new Date().getFullYear();
    const futureCalendars = await HolidayCalendarRepository.find({ locationId: id, year: { $gte: currentYear } }, organizationId, options);
    if (futureCalendars && futureCalendars.length > 0) {
      throw new ConflictError(`Cannot archive location. Active holiday calendars exist for year ${currentYear} or later.`);
    }

    const archived = await LocationRepository.updateByIdAndTenant(id, {
      status: 'ARCHIVED',
      archivedAt: new Date(),
      archivedBy: actor?.userId || null,
      archiveReason: reason?.trim() || null
    }, organizationId, options);

    await AuditService.logAction({
      organizationId,
      actorId: actor?.userId || null,
      action: 'ARCHIVE_LOCATION',
      entityType: 'Location',
      entityId: id,
      previousValue: { status: 'ACTIVE' },
      newValue: { status: 'ARCHIVED', archiveReason: reason }
    }, options);

    logger.info({ organizationId, locationId: id }, 'Archived location');
    EventBus.emit(EVENTS.LOCATION.ARCHIVED, { organizationId, locationId: id, archiveReason: reason });
    return archived;
  }

  async getLocationById(id, organizationId, options = {}) {
    const location = await LocationRepository.findByIdAndTenant(id, organizationId, options);
    if (!location) throw new NotFoundError('Location not found.');
    return location;
  }

  async getLocations(filters, organizationId, options = {}) {
    return await LocationRepository.findPaginated({
      filter: filters,
      page: options.page || 1,
      limit: options.limit || 20,
      sort: options.sort || { name: 1 }
    }, organizationId, options);
  }
}

export default new LocationService();
