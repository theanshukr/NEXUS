import AttendanceReportService from './AttendanceReportService.js';
import { AttendanceReportQuery } from '../validators/attendanceReportSchemas.js';

export class AttendanceDashboardService {
  /**
   * Composes a structured dashboard widget payload by calling existing report pipelines.
   * Does NOT run its own DB aggregations.
   */
  async getDashboardWidgets(organizationId, baseQuery) {
    // 1. Overview Analytics (uses type: 'analytics')
    const overviewDto = new AttendanceReportQuery({ ...baseQuery, type: 'analytics' });
    const overview = await AttendanceReportService.getReport(organizationId, overviewDto);

    // 2. Today's Snapshot
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDto = new AttendanceReportQuery({ ...baseQuery, type: 'summary', dateFrom: todayStr, dateTo: todayStr, limit: 10 });
    const todayData = await AttendanceReportService.getReport(organizationId, todayDto);

    // 3. Top Late Arrivals
    const lateDto = new AttendanceReportQuery({ ...baseQuery, type: 'late', limit: 5 });
    const lateArrivals = await AttendanceReportService.getReport(organizationId, lateDto);

    // 4. Top Overtime
    const overtimeDto = new AttendanceReportQuery({ ...baseQuery, type: 'overtime', limit: 5 });
    const topOvertime = await AttendanceReportService.getReport(organizationId, overtimeDto);

    return {
      overview,
      today: {
        records: todayData.data,
        total: todayData.total
      },
      lateArrivals,
      topOvertime
    };
  }
}

export default new AttendanceDashboardService();
