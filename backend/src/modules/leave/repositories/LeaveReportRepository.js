import BaseRepository from '#@/core/repositories/BaseRepository.js';
import LeaveRequest from '../models/LeaveRequest.js';

class LeaveReportRepository extends BaseRepository {
  constructor() {
    super(LeaveRequest); // Read-only aggregations on LeaveRequest
  }

  async getLeaveUtilization(organizationId, year) {
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
    
    return await this.model.aggregate([
      { 
        $match: { 
          organizationId, 
          status: 'APPROVED',
          startDate: { $gte: startOfYear },
          endDate: { $lte: endOfYear }
        } 
      },
      {
        $group: {
          _id: '$leaveCode',
          totalDays: { $sum: '$totalDays' },
          requestCount: { $sum: 1 }
        }
      }
    ]);
  }
}

export default new LeaveReportRepository();
