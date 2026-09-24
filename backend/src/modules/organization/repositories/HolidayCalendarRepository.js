import BaseRepository from '#@/core/repositories/BaseRepository.js';
import HolidayCalendar from '../models/HolidayCalendar.js';

export class HolidayCalendarRepository extends BaseRepository {
  constructor() {
    super(HolidayCalendar);
  }

  async findByLocationAndYear(locationId, year, organizationId, options = {}) {
    this._validateTenantScope(organizationId);
    const filter = this._scopeFilter({ locationId, year: parseInt(year, 10) }, organizationId);
    return await this.model.findOne(filter, null, options);
  }
}

export default new HolidayCalendarRepository();
