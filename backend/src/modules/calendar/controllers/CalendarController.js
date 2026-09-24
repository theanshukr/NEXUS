import CalendarService from '../services/CalendarService.js';
import { ValidationError } from '#@/core/errors/AppError.js';

export const openApiMetadata = {
  createCalendar: { summary: 'Create Calendar', description: 'Creates a new holiday calendar for the organization', tags: ['Calendar'] },
  getCalendar: { summary: 'Get Calendar', description: 'Retrieves the holiday calendar for a specific year and location', tags: ['Calendar'] }
};

class CalendarController {
  async createCalendar(req, res, next) {
    try {
      const { year, name, workingWeek, holidays, isDefault, locationId } = req.body;
      if (!year || !name) {
        throw new ValidationError('Year and Name are required.');
      }
      
      const calendar = await CalendarService.createCalendar(req.user.organizationId, {
        year,
        name,
        workingWeek,
        holidays,
        isDefault,
        locationId
      });
      
      res.status(201).json({ success: true, data: calendar, message: 'Calendar created successfully' });
    } catch (error) { next(error); }
  }

  async getCalendar(req, res, next) {
    try {
      const { year, locationId } = req.query;
      if (!year) {
        throw new ValidationError('Year is required.');
      }

      const calendar = await CalendarService.getCalendar(req.user.organizationId, Number(year), locationId);
      res.status(200).json({ success: true, data: calendar });
    } catch (error) { next(error); }
  }
}

export default new CalendarController();
