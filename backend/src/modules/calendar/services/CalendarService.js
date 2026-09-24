import HolidayCalendarRepository from '../repositories/HolidayCalendarRepository.js';
import CacheService from '#@/platform/cache/index.js';
import { NotFoundError } from '#@/core/errors/AppError.js';

class CalendarService {
  /**
   * Clears the cache for a calendar
   */
  async _invalidateCache(organizationId, year, locationId) {
    const locId = locationId || 'DEFAULT';
    await CacheService.delete(`calendar:${organizationId}:${year}:${locId}`);
  }

  async createCalendar(organizationId, payload) {
    const calendar = await HolidayCalendarRepository.createScoped(payload, organizationId);
    await this._invalidateCache(organizationId, calendar.year, calendar.locationId);
    return calendar;
  }

  async getCalendar(organizationId, year, locationId = null) {
    const cacheKey = `calendar:${organizationId}:${year}:${locationId || 'DEFAULT'}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const calendar = await HolidayCalendarRepository.findEffectiveCalendar(organizationId, year, locationId);
    if (!calendar) return null; // No calendar configured yet for this year

    await CacheService.set(cacheKey, calendar, 24 * 60 * 60); // Cache for 24h
    return calendar;
  }

  /**
   * Calculates net working days between two dates, excluding weekends and holidays.
   */
  async calculateNetWorkingDays(organizationId, startDate, endDate, locationId = null) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    let netDays = 0;
    let currentDate = new Date(start);

    // Group years required (e.g. leave spanning Dec 2025 -> Jan 2026)
    const years = new Set();
    let tempDate = new Date(start);
    while (tempDate <= end) {
      years.add(tempDate.getFullYear());
      tempDate.setDate(tempDate.getDate() + 1);
    }

    // Load calendars for all involved years
    const calendars = {};
    for (const year of years) {
      calendars[year] = await this.getCalendar(organizationId, year, locationId);
    }

    const DAYS_MAP = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const DEFAULT_WORKING_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

    while (currentDate <= end) {
      const year = currentDate.getFullYear();
      const calendar = calendars[year];

      const dayOfWeek = DAYS_MAP[currentDate.getDay()];
      const workingWeek = calendar ? calendar.workingWeek : DEFAULT_WORKING_WEEK;

      if (workingWeek.includes(dayOfWeek)) {
        // It's a working day. Now check if it's a holiday.
        let isHoliday = false;
        if (calendar && calendar.holidays && calendar.holidays.length > 0) {
          isHoliday = calendar.holidays.some(h => {
            const hDate = new Date(h.date);
            hDate.setHours(0, 0, 0, 0);
            return hDate.getTime() === currentDate.getTime() && !h.isOptional;
          });
        }

        if (!isHoliday) {
          netDays++;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return netDays;
  }

  async isHoliday(organizationId, date, locationId = null) {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const year = checkDate.getFullYear();
    
    const calendar = await this.getCalendar(organizationId, year, locationId);
    if (!calendar) return false;

    return calendar.holidays.some(h => {
      const hDate = new Date(h.date);
      hDate.setHours(0, 0, 0, 0);
      return hDate.getTime() === checkDate.getTime();
    });
  }
}

export default new CalendarService();
