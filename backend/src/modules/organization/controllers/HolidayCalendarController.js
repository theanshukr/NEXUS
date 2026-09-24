import HolidayCalendarService from '../services/HolidayCalendarService.js';


export const openApiMetadata = {
  getHolidayCalendar: {
    summary: 'getHolidayCalendar',
    description: '',
    tags: ['HolidayCalendar']
  },
  createOrUpdateHolidayCalendar: {
    summary: 'createOrUpdateHolidayCalendar',
    description: '',
    tags: ['HolidayCalendar']
  }
};

export class HolidayCalendarController {
  async getHolidayCalendar(req, res, next) {
    try {
      const { locationId, year } = req.params;
      const calendar = await HolidayCalendarService.getCalendarByLocationAndYear(locationId, year, req.user.organizationId);
      res.status(200).json({ success: true, data: calendar });
    } catch (error) { next(error); }
  }

  async createOrUpdateHolidayCalendar(req, res, next) {
    try {
      const { locationId, year } = req.params;
      const calendar = await HolidayCalendarService.createOrUpdateCalendar(locationId, year, req.body, req.user, req.user.organizationId);
      res.status(200).json({ success: true, data: calendar, message: `Holiday calendar updated for ${year}.` });
    } catch (error) { next(error); }
  }
}

export default new HolidayCalendarController();
