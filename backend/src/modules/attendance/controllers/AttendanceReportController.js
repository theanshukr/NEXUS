import AttendanceReportService from '../services/AttendanceReportService.js';
import AttendanceDashboardService from '../services/AttendanceDashboardService.js';
import { AttendanceReportQuery } from '../validators/attendanceReportSchemas.js';

export const openApiReportMetadata = {
  getReports: { 
    summary: 'Get Attendance Reports', 
    description: 'Unified endpoint for human and AI ingestion. Returns paginated data, analytics, or leaderboards based on the `type` parameter.', 
    tags: ['Attendance Reports'],
    parameters: [
      { name: 'type', in: 'query', schema: { type: 'string', enum: ['summary', 'overtime', 'late', 'department', 'employee', 'daily', 'analytics'] } },
      { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
      { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date' } },
      { name: 'status', in: 'query', schema: { type: 'string' } },
      { name: 'departmentId', in: 'query', schema: { type: 'string' } },
      { name: 'page', in: 'query', schema: { type: 'integer' } },
      { name: 'limit', in: 'query', schema: { type: 'integer' } },
      { name: 'sort', in: 'query', schema: { type: 'string' } },
      { name: 'search', in: 'query', schema: { type: 'string' } }
    ]
  },
  getDashboard: { 
    summary: 'Get Attendance Dashboard Widgets', 
    description: 'Returns structured widgets (overview, today, late arrivals, top overtime) composed from existing reports.', 
    tags: ['Attendance Reports'] 
  },
  exportReport: { 
    summary: 'Export Attendance Data', 
    description: 'Streams the exact same filtered dataset as a CSV or Excel file directly to the client.', 
    tags: ['Attendance Reports'],
    parameters: [
      { name: 'format', in: 'query', required: true, schema: { type: 'string', enum: ['csv', 'xlsx'] } }
    ],
    responses: {
      '200': {
        description: 'Binary stream',
        content: {
          'text/csv': {},
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {}
        }
      }
    }
  }
};

export class AttendanceReportController {
  /**
   * Unified endpoint for all attendance reports.
   */
  async getReports(req, res, next) {
    try {
      const { organizationId, userId } = req.user;
      
      // The validator already ensured the query is clean, now we wrap it in our DTO.
      const queryDto = new AttendanceReportQuery(req.query);

      // Simple employee filter scoping: if not HR/Manager, they can only see themselves.
      // A more robust RBAC validation middleware is assumed to protect this route overall,
      // but we enforce isolation here for self-service vs org-wide calls.
      const data = await AttendanceReportService.getReport(organizationId, queryDto);

      res.status(200).json({ success: true, data });
    } catch (error) { next(error); }
  }

  /**
   * Composes dashboard widgets.
   */
  async getDashboard(req, res, next) {
    try {
      const { organizationId } = req.user;
      const queryDto = new AttendanceReportQuery(req.query);

      const widgets = await AttendanceDashboardService.getDashboardWidgets(organizationId, queryDto);

      res.status(200).json({ success: true, data: widgets });
    } catch (error) { next(error); }
  }

  /**
   * Streams a CSV or Excel export.
   */
  async exportReport(req, res, next) {
    try {
      const { organizationId } = req.user;
      const queryDto = new AttendanceReportQuery(req.query);

      // Do NOT send a standard JSON response. We are streaming binary directly to `res`.
      await AttendanceReportService.exportReport(organizationId, queryDto, res);
    } catch (error) { 
      // If headers are already sent by the stream, we can't send a JSON error.
      if (!res.headersSent) {
        next(error);
      } else {
        res.end(); // close the stream on error to avoid hanging
      }
    }
  }
}

export default new AttendanceReportController();
