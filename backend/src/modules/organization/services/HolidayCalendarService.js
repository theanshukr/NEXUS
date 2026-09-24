import logger from '#@/platform/logger/index.js';
import HolidayCalendarRepository from '../repositories/HolidayCalendarRepository.js';
import LocationRepository from '../repositories/LocationRepository.js';
import EVENTS from '#@/core/constants/events/index.js';
import AuditService from '#@/modules/audit/services/AuditService.js';
import EventBus from '#@/core/events/EventBus.js';
import { ValidationError, NotFoundError } from '#@/core/errors/AppError.js';

export class HolidayCalendarService {
  async createOrUpdateCalendar(locationId, year, payload, actor, organizationId, options = {}) {
    const location = await LocationRepository.findByIdAndTenant(locationId, organizationId, options);
    if (!location || location.status !== 'ACTIVE') {
      throw new ValidationError('Location not found or is inactive.');
    }

    const { holidays } = payload;
    let calendar = await HolidayCalendarRepository.findByLocationAndYear(locationId, year, organizationId, options);
    
    let action = 'UPDATE_HOLIDAY_CALENDAR';
    if (!calendar) {
      action = 'CREATE_HOLIDAY_CALENDAR';
      calendar = await HolidayCalendarRepository.createScoped({
        locationId,
        year: parseInt(year, 10),
        holidays: holidays || []
      }, organizationId, options);
    } else {
      calendar = await HolidayCalendarRepository.updateByIdAndTenant(calendar._id, { holidays }, organizationId, options);
    }

    await AuditService.logAction({
      organizationId,
      actorId: actor?.userId || null,
      action: action,
      entityType: 'HolidayCalendar',
      entityId: calendar._id,
      newValue: { year: calendar.year, locationId: calendar.locationId, holidaysCount: calendar.holidays.length }
    }, options);

    logger.info({ organizationId, calendarId: calendar._id }, `${action} successful`);
    EventBus.emit(action === 'CREATE_HOLIDAY_CALENDAR' ? EVENTS.HOLIDAY.CREATED : EVENTS.HOLIDAY.UPDATED, { 
      organizationId, locationId, year: calendar.year, calendarId: calendar._id 
    });
    return calendar;
  }

  async getCalendarByLocationAndYear(locationId, year, organizationId, options = {}) {
    const calendar = await HolidayCalendarRepository.findByLocationAndYear(locationId, year, organizationId, options);
    if (!calendar) throw new NotFoundError('Holiday calendar not found for this location and year.');
    return calendar;
  }
}

export default new HolidayCalendarService();
