import BaseRepository from '#@/core/repositories/BaseRepository.js';
import LeaveRequest from '../models/LeaveRequest.js';

class LeaveRequestRepository extends BaseRepository {
  constructor() {
    super(LeaveRequest);
  }

  /**
   * Finds overlapping requests for an employee that are not rejected or cancelled.
   */
  async findOverlappingActiveRequests(organizationId, employeeId, startDate, endDate) {
    return await this.find({
      employeeId,
      status: { $in: ['PENDING', 'APPROVED'] },
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
      ]
    }, organizationId);
  }
}

export default new LeaveRequestRepository();
