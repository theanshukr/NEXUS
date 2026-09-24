import AttendanceClockService from '../services/AttendanceClockService.js';
import AttendanceRecordRepository from '../repositories/AttendanceRecordRepository.js';
import EmployeeRepository from '#@/modules/employees/repositories/EmployeeRepository.js';
import { toLocalDateString } from '../utils/TimeCalculator.js';
import LocationRepository from '#@/modules/organization/repositories/LocationRepository.js';
import { NotFoundError } from '#@/core/errors/AppError.js';

export const openApiMetadata = {
  clockIn: { summary: 'Clock In', description: 'Records employee clock-in with GPS coordinates', tags: ['Attendance'] },
  clockOut: { summary: 'Clock Out', description: 'Records employee clock-out and finalizes daily attendance', tags: ['Attendance'] },
  getToday: { summary: 'Get Today\'s Attendance', description: 'Retrieves the current user\'s attendance record for today', tags: ['Attendance'] },
  getMyAttendance: { summary: 'Get My Attendance History', description: 'Paginated attendance history for the authenticated employee', tags: ['Attendance'] }
};

export class AttendanceController {
  async clockIn(req, res, next) {
    try {
      const { gpsData, deviceData } = req.body;
      // Enrich device data with IP from the request.
      const enrichedDeviceData = { ...deviceData, ip: req.ip || req.connection?.remoteAddress };
      const record = await AttendanceClockService.clockIn({
        userId: req.user.userId,
        gpsData,
        deviceData: enrichedDeviceData,
        organizationId: req.user.organizationId
      });
      res.status(201).json({ success: true, data: record, message: 'Clock-in recorded.' });
    } catch (error) { next(error); }
  }

  async clockOut(req, res, next) {
    try {
      const { gpsData, deviceData } = req.body;
      const enrichedDeviceData = { ...deviceData, ip: req.ip || req.connection?.remoteAddress };
      const record = await AttendanceClockService.clockOut({
        userId: req.user.userId,
        gpsData,
        deviceData: enrichedDeviceData,
        organizationId: req.user.organizationId
      });
      res.status(200).json({ success: true, data: record, message: 'Clock-out recorded.' });
    } catch (error) { next(error); }
  }

  async getToday(req, res, next) {
    try {
      const { organizationId, userId } = req.user;
      const employee = await EmployeeRepository.findByUserId(userId, organizationId);
      if (!employee) throw new NotFoundError('Employee profile not found.');

      const location = await LocationRepository.findByIdAndTenant(employee.locationId, organizationId);
      const timezone = location?.timezone || 'UTC';
      const today = toLocalDateString(new Date(), timezone);

      const record = await AttendanceRecordRepository.findByEmployeeAndDate(employee._id, today, organizationId);
      res.status(200).json({ success: true, data: record || null });
    } catch (error) { next(error); }
  }

  async getMyAttendance(req, res, next) {
    try {
      const { organizationId, userId } = req.user;
      const { startDate, endDate } = req.query;
      const employee = await EmployeeRepository.findByUserId(userId, organizationId);
      if (!employee) throw new NotFoundError('Employee profile not found.');

      const records = await AttendanceRecordRepository.findByEmployeeAndDateRange(
        employee._id,
        startDate || '2000-01-01',
        endDate || '2099-12-31',
        organizationId
      );
      res.status(200).json({ success: true, data: records });
    } catch (error) { next(error); }
  }
}

export default new AttendanceController();
