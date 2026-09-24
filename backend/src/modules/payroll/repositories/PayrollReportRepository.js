import BaseRepository from '#@/core/repositories/BaseRepository.js';
import { Payslip } from '../models/Payslip.js';
import mongoose from 'mongoose';

export class PayrollReportRepository extends BaseRepository {
  constructor() {
    super(Payslip);
  }

  /**
   * Calculates total liability (gross, net, total deductions) for a given payroll run or cycle.
   */
  async getCycleLiabilitySummary(payrollCycleId, organizationId, options = {}) {
    this._validateTenantScope(organizationId);
    const session = options.session || null;

    const pipeline = [
      {
        $match: {
          organizationId: new mongoose.Types.ObjectId(organizationId),
          payrollCycleId: new mongoose.Types.ObjectId(payrollCycleId),
          status: 'FINALIZED'
        }
      },
      {
        $group: {
          _id: null,
          totalGross: { $sum: '$grossPay' },
          totalNet: { $sum: '$netPay' },
          totalBase: { $sum: '$breakdown.baseSalary' },
          totalOvertime: { $sum: '$breakdown.overtime' },
          totalLop: { $sum: '$breakdown.lopAmount' },
          employeeCount: { $sum: 1 }
        }
      }
    ];

    const results = await this.model.aggregate(pipeline).session(session);
    return results[0] || {
      totalGross: 0,
      totalNet: 0,
      totalBase: 0,
      totalOvertime: 0,
      totalLop: 0,
      employeeCount: 0
    };
  }

  /**
   * Summarizes payroll expenses grouped by employee department.
   */
  async getDepartmentWiseSummary(payrollCycleId, organizationId, options = {}) {
    this._validateTenantScope(organizationId);
    const session = options.session || null;

    const pipeline = [
      {
        $match: {
          organizationId: new mongoose.Types.ObjectId(organizationId),
          payrollCycleId: new mongoose.Types.ObjectId(payrollCycleId),
          status: 'FINALIZED'
        }
      },
      {
        $lookup: {
          from: 'employees',
          localField: 'employeeId',
          foreignField: '_id',
          as: 'employee'
        }
      },
      { $unwind: '$employee' },
      {
        $group: {
          _id: '$employee.departmentId',
          totalGross: { $sum: '$grossPay' },
          totalNet: { $sum: '$netPay' },
          employeeCount: { $sum: 1 }
        }
      }
    ];

    return await this.model.aggregate(pipeline).session(session);
  }
}

export default PayrollReportRepository;
