import AttendanceRecord from '../models/AttendanceRecord.js';
import Employee from '#@/modules/employees/models/Employee.js';
import mongoose from 'mongoose';

export class AttendanceReportRepository {
  /**
   * Constructs the base aggregation pipeline applying standardized filters.
   * Joins the Employee collection to allow filtering by departmentId, managerId, locationId.
   */
  _buildBasePipeline(organizationId, filters) {
    const matchStage = { organizationId: new mongoose.Types.ObjectId(organizationId) };

    if (filters.dateFrom || filters.dateTo) {
      matchStage.date = {};
      if (filters.dateFrom) matchStage.date.$gte = filters.dateFrom;
      if (filters.dateTo) matchStage.date.$lte = filters.dateTo;
    }

    if (filters.status) {
      matchStage.attendanceStatus = filters.status;
    }
    if (filters.employeeId) {
      matchStage.employeeId = filters.employeeId;
    }
    
    // We must join the employee to filter by manager, dept, or location.
    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'employees',
          localField: 'employeeId',
          foreignField: '_id',
          as: 'employee'
        }
      },
      { $unwind: '$employee' }
    ];

    const employeeMatch = {};
    if (filters.managerId) employeeMatch['employee.managerId'] = filters.managerId;
    if (filters.departmentId) employeeMatch['employee.departmentId'] = filters.departmentId;
    if (filters.locationId) employeeMatch['employee.locationId'] = filters.locationId;
    
    if (Object.keys(employeeMatch).length > 0) {
      pipeline.push({ $match: employeeMatch });
    }

    // Optional Search via regex
    if (filters.search) {
      pipeline.push({
        $match: {
          $or: [
            { 'employee.firstName': { $regex: filters.search, $options: 'i' } },
            { 'employee.lastName': { $regex: filters.search, $options: 'i' } },
            { 'employee.employeeCode': { $regex: filters.search, $options: 'i' } }
          ]
        }
      });
    }

    return pipeline;
  }

  /**
   * Returns a standard paginated list of attendance records with enriched employee data.
   */
  async getPaginatedReports(organizationId, filters, pagination) {
    const pipeline = this._buildBasePipeline(organizationId, filters);
    
    // Count total documents before pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await AttendanceRecord.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    const { page = 1, limit = 50, sort = '-date' } = pagination;
    const skip = (page - 1) * limit;

    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    
    // Handle specific sort fields targeting employee object
    const actualSortField = sortField === 'employeeName' ? 'employee.firstName' : sortField;

    pipeline.push(
      { $sort: { [actualSortField]: sortOrder } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          date: 1,
          attendanceStatus: 1,
          workflowStatus: 1,
          workingHours: 1,
          overtimeHours: 1,
          'employee._id': 1,
          'employee.firstName': 1,
          'employee.lastName': 1,
          'employee.employeeCode': 1,
          'employee.departmentId': 1
        }
      }
    );

    const data = await AttendanceRecord.aggregate(pipeline);
    return { data, total, page, limit };
  }

  /**
   * Returns a MongoDB Cursor for streaming large exports.
   */
  getExportCursor(organizationId, filters, sort = '-date') {
    const pipeline = this._buildBasePipeline(organizationId, filters);
    
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    const actualSortField = sortField === 'employeeName' ? 'employee.firstName' : sortField;
    
    pipeline.push(
      { $sort: { [actualSortField]: sortOrder } },
      {
        $project: {
          date: 1,
          attendanceStatus: 1,
          workflowStatus: 1,
          workingHours: 1,
          overtimeHours: 1,
          'employee.employeeCode': 1,
          'employee.firstName': 1,
          'employee.lastName': 1
        }
      }
    );

    return AttendanceRecord.aggregate(pipeline).cursor({ batchSize: 1000 });
  }

  /**
   * Aggregates organization-wide analytics (Absence %, Overtime, etc).
   */
  async getAnalytics(organizationId, filters) {
    const pipeline = this._buildBasePipeline(organizationId, filters);

    pipeline.push({
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        presentCount: {
          $sum: { $cond: [{ $eq: ['$attendanceStatus', 'PRESENT'] }, 1, 0] }
        },
        absentCount: {
          $sum: { $cond: [{ $eq: ['$attendanceStatus', 'ABSENT'] }, 1, 0] }
        },
        halfDayCount: {
          $sum: { $cond: [{ $eq: ['$attendanceStatus', 'HALF_DAY'] }, 1, 0] }
        },
        lateCount: {
          $sum: { $cond: [{ $eq: ['$attendanceStatus', 'LATE'] }, 1, 0] }
        },
        totalOvertimeHours: { $sum: { $ifNull: ['$overtimeHours', 0] } },
        totalWorkingHours: { $sum: { $ifNull: ['$workingHours', 0] } },
      }
    });

    const result = await AttendanceRecord.aggregate(pipeline);
    return result[0] || {
      totalRecords: 0,
      presentCount: 0,
      absentCount: 0,
      halfDayCount: 0,
      lateCount: 0,
      totalOvertimeHours: 0,
      totalWorkingHours: 0
    };
  }

  /**
   * Aggregates top employees with overtime.
   */
  async getTopOvertime(organizationId, filters, limit = 10) {
    const pipeline = this._buildBasePipeline(organizationId, filters);
    
    pipeline.push(
      { $match: { overtimeHours: { $gt: 0 } } },
      {
        $group: {
          _id: '$employee._id',
          totalOvertime: { $sum: '$overtimeHours' },
          employeeName: { $first: { $concat: ['$employee.firstName', ' ', '$employee.lastName'] } },
          employeeCode: { $first: '$employee.employeeCode' }
        }
      },
      { $sort: { totalOvertime: -1 } },
      { $limit: limit }
    );

    return AttendanceRecord.aggregate(pipeline);
  }

  /**
   * Aggregates top employees with late arrivals.
   */
  async getTopLateArrivals(organizationId, filters, limit = 10) {
    const pipeline = this._buildBasePipeline(organizationId, filters);
    
    pipeline.push(
      { $match: { attendanceStatus: 'LATE' } },
      {
        $group: {
          _id: '$employee._id',
          lateCount: { $sum: 1 },
          employeeName: { $first: { $concat: ['$employee.firstName', ' ', '$employee.lastName'] } },
          employeeCode: { $first: '$employee.employeeCode' }
        }
      },
      { $sort: { lateCount: -1 } },
      { $limit: limit }
    );

    return AttendanceRecord.aggregate(pipeline);
  }
}

export default new AttendanceReportRepository();
