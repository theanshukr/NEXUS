import LeaveReportRepository from '../repositories/LeaveReportRepository.js';

class LeaveReportService {
  async getLeaveUtilization(organizationId, year) {
    const data = await LeaveReportRepository.getLeaveUtilization(organizationId, year);
    return data.map(item => ({
      leaveCode: item._id,
      totalDays: item.totalDays,
      requestCount: item.requestCount
    }));
  }
}

export default new LeaveReportService();
