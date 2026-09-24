import AttendanceReportRepository from '../repositories/AttendanceReportRepository.js';
import { streamCsv, streamExcel } from '../utils/ExportGenerator.js';

export class AttendanceReportService {
  /**
   * Universal entry point for fetching attendance reports.
   * Dispatches to the correct repository method based on the `type` in the DTO.
   */
  async getReport(organizationId, queryDto) {
    switch (queryDto.type) {
      case 'summary':
      case 'department':
      case 'employee':
      case 'daily':
        // For general list reports, we return paginated data
        return await AttendanceReportRepository.getPaginatedReports(organizationId, queryDto, queryDto);
      
      case 'analytics':
        // Org-wide metrics
        return await AttendanceReportRepository.getAnalytics(organizationId, queryDto);
      
      case 'overtime':
        // Top overtime earners
        return await AttendanceReportRepository.getTopOvertime(organizationId, queryDto, queryDto.limit);
        
      case 'late':
        // Top late arrivals
        return await AttendanceReportRepository.getTopLateArrivals(organizationId, queryDto, queryDto.limit);
        
      default:
        return await AttendanceReportRepository.getPaginatedReports(organizationId, queryDto, queryDto);
    }
  }

  /**
   * Generates a streaming export of the exact same filtered dataset.
   */
  async exportReport(organizationId, queryDto, res) {
    const cursor = AttendanceReportRepository.getExportCursor(organizationId, queryDto, queryDto.sort);
    
    // Generate filename based on date range
    const filename = `attendance_export_${queryDto.dateFrom || 'all'}_to_${queryDto.dateTo || 'all'}.${queryDto.format === 'csv' ? 'csv' : 'xlsx'}`;

    if (queryDto.format === 'csv') {
      await streamCsv(cursor, res, filename);
    } else {
      await streamExcel(cursor, res, filename);
    }
  }
}

export default new AttendanceReportService();
