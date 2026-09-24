import BaseRepository from '#@/core/repositories/BaseRepository.js';
import AttendanceRecord from '../models/AttendanceRecord.js';

export class AttendanceRecordRepository extends BaseRepository {
  constructor() {
    super(AttendanceRecord);
  }

  /**
   * Finds the single attendance record for an employee on a given date string (YYYY-MM-DD).
   * Primary lookup used by clock-in and regularization workflows.
   */
  async findByEmployeeAndDate(employeeId, date, organizationId, options = {}) {
    return await this.model
      .findOne(this._scopeFilter({ employeeId, date }, organizationId))
      .session(options.session || null);
  }

  /**
   * Finds the most recent OPEN record for an employee — i.e., a record that has a
   * CLOCK_IN event but NO CLOCK_OUT event. Used exclusively by clockOut().
   *
   * NIGHT SHIFT SAFETY: Clock-out must NOT derive the attendance date from "now"
   * because a night shift worker who clocked in at 22:00 (date=D) and clocks out at
   * 06:00 (date=D+1) has their record on D, not D+1. This query finds the record
   * regardless of which calendar date it was created on, preventing the bug where
   * `toLocalDateString(now, timezone)` returns D+1 and the lookup finds nothing.
   */
  async findOpenRecord(employeeId, organizationId, options = {}) {
    return await this.model
      .findOne(
        this._scopeFilter({
          employeeId,
          // Record must have at least one CLOCK_IN event...
          'attendanceEvents.eventType': 'CLOCK_IN',
          // ...and must NOT have any CLOCK_OUT event.
          attendanceEvents: {
            $not: {
              $elemMatch: { eventType: 'CLOCK_OUT' }
            }
          }
        }, organizationId)
      )
      .sort({ createdAt: -1 })
      .session(options.session || null);
  }

  /**
   * Finds all records for an employee within a date range (inclusive).
   * Used by /me, /history, and report endpoints.
   */
  async findByEmployeeAndDateRange(employeeId, startDate, endDate, organizationId, options = {}) {
    return await this.model
      .find(this._scopeFilter({ employeeId, date: { $gte: startDate, $lte: endDate } }, organizationId))
      .sort({ date: -1 })
      .session(options.session || null);
  }

  /**
   * Finds all records for a list of employeeIds on a specific date.
   * Used by manager team-view (/team) endpoint.
   */
  async findByEmployeeIdsAndDate(employeeIds, date, organizationId, options = {}) {
    return await this.model
      .find(this._scopeFilter({ employeeId: { $in: employeeIds }, date }, organizationId))
      .session(options.session || null);
  }

  /**
   * Finds all open records (CLOCK_IN without CLOCK_OUT) in an organization.
   * Used by AttendanceReconciliationService to evaluate stale sessions.
   */
  async findAllOpenRecords(organizationId, options = {}) {
    return await this.model
      .find(
        this._scopeFilter({
          'attendanceEvents.eventType': 'CLOCK_IN',
          attendanceEvents: {
            $not: {
              $elemMatch: { eventType: 'CLOCK_OUT' }
            }
          }
        }, organizationId)
      )
      .session(options.session || null);
  }

  /**
   * Finds all attendance records in a date range for an organization.
   * Used by pay period finalization and range validation guards.
   */
  async findByDateRange(organizationId, startDate, endDate, options = {}) {
    return await this.model
      .find(this._scopeFilter({ date: { $gte: startDate, $lte: endDate } }, organizationId))
      .session(options.session || null);
  }

  /**
   * Finds strictly finalized records in a date range for payroll consumption (M-07 Payroll / BI).
   */
  async findForPayrollRecords(organizationId, startDate, endDate, options = {}) {
    return await this.model
      .find(this._scopeFilter({ date: { $gte: startDate, $lte: endDate }, isFinalized: true }, organizationId))
      .sort({ date: 1, employeeId: 1 })
      .session(options.session || null);
  }

  /**
   * Updates payrollStatus for finalized records matching an expected previous status.
   * Enforces optimistic locking during payroll state transitions.
   */
  async updatePayrollStatus(organizationId, startDate, endDate, expectedOldStatus, newStatus, options = {}) {
    const updatePayload = {
      $set: {
        payrollStatus: newStatus
      }
    };
    return await this.model.updateMany(
      this._scopeFilter({
        date: { $gte: startDate, $lte: endDate },
        isFinalized: true,
        payrollStatus: expectedOldStatus
      }, organizationId),
      updatePayload,
      options
    );
  }
}

export default new AttendanceRecordRepository();
