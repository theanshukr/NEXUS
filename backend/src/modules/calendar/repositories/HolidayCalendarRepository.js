import BaseRepository from '#@/core/repositories/BaseRepository.js';
import HolidayCalendar from '../models/HolidayCalendar.js';

class HolidayCalendarRepository extends BaseRepository {
  constructor() {
    super(HolidayCalendar);
  }

  /**
   * Retrieves the calendar for a specific location and year.
   * Falls back to the organization's default calendar if a location-specific one is not found.
   */
  async findEffectiveCalendar(organizationId, year, locationId = null) {
    let query = { year, isActive: true };
    
    if (locationId) {
      const locationCalendar = await this.find({ ...query, locationId }, organizationId);
      if (locationCalendar.length > 0) return locationCalendar[0];
    }
    
    const defaultCalendar = await this.find({ ...query, isDefault: true }, organizationId);
    return defaultCalendar.length > 0 ? defaultCalendar[0] : null;
  }
}

export default new HolidayCalendarRepository();
