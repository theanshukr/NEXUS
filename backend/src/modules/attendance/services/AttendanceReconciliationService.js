import logger from '#@/platform/logger/index.js';
import AttendanceRecordRepository from '../repositories/AttendanceRecordRepository.js';
import AuditService from '#@/modules/audit/services/AuditService.js';
import EventBus from '#@/core/events/EventBus.js';
import EVENTS from '#@/core/constants/events/index.js';
import { runInTransaction } from '#@/platform/database/db.js';
import { ConflictError, NotFoundError, ValidationError } from '#@/core/errors/AppError.js';

/**
 * AttendanceReconciliationService — M-05.5
 *
 * Owns EOD session reconciliation, pay period finalization, read models for payroll,
 * and optimistic payroll lifecycle state machine transitions.
 *
 * KEY CONTRACTS:
 * - Attendance owns mutability of isFinalized and payrollStatus.
 * - Once isFinalized === true, record is immutable by normal clocking and regularization.
 * - Payroll module (M-07) triggers payrollStatus changes strictly through this service.
 * - Single Source Transition Validator Kernel enforces valid state jumps.
 */
export class AttendanceReconciliationService {
  /**
   * Reconciles stale open sessions (records with CLOCK_IN but no CLOCK_OUT exceeding maximumOpenAttendanceHours).
   *
   * @param {string} organizationId
   * @param {number|null} [hoursThreshold] - Optional explicit threshold override in hours
   * @param {string|null} [actorId]
   * @returns {Promise<Object>} Reconciliation summary
   */
  async reconcileStaleSessions(organizationId, hoursThreshold = null, actorId = null) {
    const now = new Date();
    const openRecords = await AttendanceRecordRepository.findAllOpenRecords(organizationId);
    
    const reconciledRecords = [];

    for (const record of openRecords) {
      if (record.isFinalized || record.payrollStatus === 'LOCKED') continue;

      const clockInEvent = record.attendanceEvents.find(e => e.eventType === 'CLOCK_IN');
      if (!clockInEvent || !clockInEvent.originalTime) continue;

      const thresholdHours = hoursThreshold ?? record.policySnapshot?.maximumOpenAttendanceHours ?? 16;
      const elapsedHours = (now.getTime() - new Date(clockInEvent.originalTime).getTime()) / (1000 * 60 * 60);

      if (elapsedHours >= thresholdHours) {
        const updated = await AttendanceRecordRepository.updateByIdAndTenant(
          record._id,
          {
            attendanceStatus: 'MISSING_CLOCK_OUT',
            workingHours: 0,
            workflowStatus: 'RECONCILIATION_REQUIRED'
          },
          organizationId
        );

        await AuditService.logAction({
          organizationId,
          actorId: actorId || record.employeeId || organizationId,
          action: 'RECONCILE_STALE_ATTENDANCE',
          entityType: 'AttendanceRecord',
          entityId: record._id || organizationId,
          newValue: {
            attendanceStatus: 'MISSING_CLOCK_OUT',
            workingHours: 0,
            workflowStatus: 'RECONCILIATION_REQUIRED',
            elapsedHours: Math.round(elapsedHours * 10) / 10
          }
        });

        EventBus.emit(EVENTS.ATTENDANCE.RECORD_RECONCILED, {
          recordId: record._id,
          employeeId: record.employeeId,
          organizationId,
          date: record.date,
          timestamp: now.toISOString()
        });

        reconciledRecords.push(record._id);
      }
    }

    const summary = {
      organizationId,
      totalOpenSessions: openRecords.length,
      reconciledCount: reconciledRecords.length,
      records: reconciledRecords,
      timestamp: now.toISOString()
    };

    if (reconciledRecords.length > 0) {
      logger.info({ organizationId, reconciledCount: reconciledRecords.length }, 'Stale attendance sessions reconciled');
      EventBus.emit(EVENTS.ATTENDANCE.RECONCILIATION_COMPLETED, summary);
    }

    return summary;
  }

  /**
   * Finalizes an attendance pay period atomically across the specified date range.
   *
   * @param {string} organizationId
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate - YYYY-MM-DD
   * @param {string} actorId
   * @returns {Promise<Object>} Finalization summary
   */
  async finalizePayPeriod(organizationId, startDate, endDate, actorId) {
    const now = new Date();

    return await runInTransaction(async (session) => {
      const records = await AttendanceRecordRepository.findByDateRange(organizationId, startDate, endDate, { session });
      if (records.length === 0) {
        throw new NotFoundError('No attendance records found in the specified date range.');
      }

      const blockedRecords = [];
      let allAlreadyFinalized = true;

      for (const record of records) {
        if (!record.isFinalized) {
          allAlreadyFinalized = false;
        }

        const hasClockIn = record.attendanceEvents.some(e => e.eventType === 'CLOCK_IN');
        const hasClockOut = record.attendanceEvents.some(e => e.eventType === 'CLOCK_OUT');
        const isOpenSession = hasClockIn && !hasClockOut;

        if (record.workflowStatus === 'REGULARIZATION_PENDING') {
          blockedRecords.push({
            recordId: record._id,
            employeeId: record.employeeId,
            date: record.date,
            reason: 'REGULARIZATION_PENDING'
          });
        } else if (record.workflowStatus === 'RECONCILIATION_REQUIRED') {
          blockedRecords.push({
            recordId: record._id,
            employeeId: record.employeeId,
            date: record.date,
            reason: 'RECONCILIATION_REQUIRED'
          });
        } else if (isOpenSession) {
          blockedRecords.push({
            recordId: record._id,
            employeeId: record.employeeId,
            date: record.date,
            reason: 'OPEN_SESSION'
          });
        }
      }

      // Idempotency Guarantee: If all records already finalized and no blocked records exist
      if (allAlreadyFinalized && blockedRecords.length === 0) {
        return {
          success: true,
          alreadyFinalized: true,
          finalizedCount: 0,
          startDate,
          endDate,
          finalizedBy: actorId,
          timestamp: now.toISOString()
        };
      }

      // Atomic Period Finalization Guarantee: Reject entire batch if any incomplete record exists
      if (blockedRecords.length > 0) {
        const err = new ConflictError(
          'Pay period cannot be finalized due to incomplete attendance records.',
          409,
          'ERR_CONFLICT'
        );
        err.blockedRecords = blockedRecords;
        throw err;
      }

      // Finalize all unfinalized records in range
      const unfinalizedIds = records.filter(r => !r.isFinalized).map(r => r._id);
      await AttendanceRecordRepository.model.updateMany(
        { _id: { $in: unfinalizedIds }, organizationId },
        { $set: { isFinalized: true } },
        { session }
      );

      await AuditService.logAction({
        organizationId,
        actorId: actorId || unfinalizedIds[0] || organizationId,
        action: 'FINALIZE_PAY_PERIOD',
        entityType: 'AttendanceRecord',
        entityId: unfinalizedIds[0] || organizationId,
        newValue: { startDate, endDate, finalizedCount: unfinalizedIds.length }
      }, { session });

      logger.info({ organizationId, startDate, endDate, finalizedCount: unfinalizedIds.length }, 'Pay period finalized');

      EventBus.emit(EVENTS.ATTENDANCE.PAY_PERIOD_FINALIZED, {
        organizationId,
        startDate,
        endDate,
        recordCount: unfinalizedIds.length,
        finalizedBy: actorId,
        timestamp: now.toISOString()
      });

      return {
        success: true,
        alreadyFinalized: false,
        finalizedCount: unfinalizedIds.length,
        startDate,
        endDate,
        finalizedBy: actorId,
        timestamp: now.toISOString()
      };
    });
  }

  /**
   * Prepares the canonical read model feed of finalized attendance records for payroll processing.
   *
   * @param {string} organizationId
   * @param {string} startDate
   * @param {string} endDate
   * @returns {Promise<Array<Object>>}
   */
  async preparePayrollFeed(organizationId, startDate, endDate) {
    const records = await AttendanceRecordRepository.findForPayrollRecords(organizationId, startDate, endDate);
    return records.map(record => ({
      recordId: record._id,
      employeeId: record.employeeId,
      organizationId: record.organizationId,
      date: record.date,
      shiftId: record.shiftId,
      locationId: record.locationId,
      attendanceStatus: record.attendanceStatus,
      workingHours: record.workingHours,
      overtimeHours: record.overtimeHours,
      isFinalized: record.isFinalized,
      payrollStatus: record.payrollStatus
    }));
  }

  /**
   * Single Source Transition Validator Kernel.
   * Enforces allowed payroll lifecycle state transitions:
   * NOT_PROCESSED -> PROCESSING -> PROCESSED -> LOCKED
   *
   * @param {string} currentStatus
   * @param {string} nextStatus
   * @param {string} [organizationId]
   * @param {string} [startDate]
   * @param {string} [endDate]
   */
  assertPayrollTransition(currentStatus, nextStatus, organizationId = null, startDate = null, endDate = null) {
    const allowed = {
      NOT_PROCESSED: 'PROCESSING',
      PROCESSING: 'PROCESSED',
      PROCESSED: 'LOCKED'
    };

    if (allowed[currentStatus] !== nextStatus) {
      if (organizationId) {
        EventBus.emit(EVENTS.ATTENDANCE.PAYROLL_STATE_VALIDATION_FAILED, {
          organizationId,
          startDate,
          endDate,
          currentStatus,
          nextStatus,
          timestamp: new Date().toISOString()
        });
      }
      throw new ConflictError(`Invalid payroll status transition from '${currentStatus}' to '${nextStatus}'.`);
    }
  }

  /**
   * Reusable Range Guard.
   * Verifies that every attendance record in the target pay period has isFinalized === true.
   *
   * @param {string} organizationId
   * @param {string} startDate
   * @param {string} endDate
   * @returns {Promise<Array<Object>>} The records in the range
   */
  async assertAllRecordsFinalized(organizationId, startDate, endDate) {
    const records = await AttendanceRecordRepository.findByDateRange(organizationId, startDate, endDate);
    if (records.length === 0) {
      throw new NotFoundError('No attendance records found in the specified pay period.');
    }

    const unfinalized = records.filter(r => !r.isFinalized);
    if (unfinalized.length > 0) {
      EventBus.emit(EVENTS.ATTENDANCE.PAYROLL_STATE_VALIDATION_FAILED, {
        organizationId,
        startDate,
        endDate,
        reason: 'UNFINALIZED_RECORDS_EXIST',
        unfinalizedCount: unfinalized.length,
        timestamp: new Date().toISOString()
      });
      throw new ConflictError('All attendance records in the pay period must be finalized before payroll processing.');
    }

    return records;
  }

  /**
   * Marks records in the pay period as PROCESSING.
   */
  async markPayrollProcessing(organizationId, startDate, endDate, payrollRunId, actorId) {
    const records = await this.assertAllRecordsFinalized(organizationId, startDate, endDate);
    for (const record of records) {
      this.assertPayrollTransition(record.payrollStatus, 'PROCESSING', organizationId, startDate, endDate);
    }

    const result = await AttendanceRecordRepository.updatePayrollStatus(
      organizationId,
      startDate,
      endDate,
      'NOT_PROCESSED',
      'PROCESSING'
    );

    await AuditService.logAction({
      organizationId,
      actorId: actorId || records[0]?.employeeId || organizationId,
      action: 'PAYROLL_PROCESSING_STARTED',
      entityType: 'AttendanceRecord',
      entityId: records[0]?._id || organizationId,
      newValue: { startDate, endDate, payrollRunId, count: result.modifiedCount }
    });

    EventBus.emit(EVENTS.ATTENDANCE.PAYROLL_PROCESSING_STARTED, {
      organizationId,
      startDate,
      endDate,
      payrollRunId,
      actorId,
      timestamp: new Date().toISOString()
    });

    return { success: true, modifiedCount: result.modifiedCount };
  }

  /**
   * Marks records in the pay period as PROCESSED.
   */
  async markPayrollProcessed(organizationId, startDate, endDate, payrollRunId, actorId) {
    const records = await this.assertAllRecordsFinalized(organizationId, startDate, endDate);
    for (const record of records) {
      this.assertPayrollTransition(record.payrollStatus, 'PROCESSED', organizationId, startDate, endDate);
    }

    const now = new Date();
    const result = await AttendanceRecordRepository.updatePayrollStatus(
      organizationId,
      startDate,
      endDate,
      'PROCESSING',
      'PROCESSED'
    );

    await AuditService.logAction({
      organizationId,
      actorId: actorId || records[0]?.employeeId || organizationId,
      action: 'PAYROLL_PROCESSED',
      entityType: 'AttendanceRecord',
      entityId: records[0]?._id || organizationId,
      newValue: { startDate, endDate, payrollRunId, count: result.modifiedCount }
    });

    EventBus.emit(EVENTS.ATTENDANCE.PAYROLL_PROCESSED, {
      organizationId,
      startDate,
      endDate,
      payrollRunId,
      actorId,
      timestamp: now.toISOString()
    });

    return { success: true, modifiedCount: result.modifiedCount };
  }

  /**
   * Locks the pay period (payrollStatus = LOCKED).
   */
  async lockPayPeriod(organizationId, startDate, endDate, payrollRunId, actorId) {
    const records = await this.assertAllRecordsFinalized(organizationId, startDate, endDate);
    for (const record of records) {
      this.assertPayrollTransition(record.payrollStatus, 'LOCKED', organizationId, startDate, endDate);
    }

    const now = new Date();
    const result = await AttendanceRecordRepository.updatePayrollStatus(
      organizationId,
      startDate,
      endDate,
      'PROCESSED',
      'LOCKED'
    );

    await AuditService.logAction({
      organizationId,
      actorId: actorId || records[0]?.employeeId || organizationId,
      action: 'PAYROLL_LOCKED',
      entityType: 'AttendanceRecord',
      entityId: records[0]?._id || organizationId,
      newValue: { startDate, endDate, payrollRunId, count: result.modifiedCount }
    });

    EventBus.emit(EVENTS.ATTENDANCE.PAYROLL_LOCKED, {
      organizationId,
      startDate,
      endDate,
      payrollRunId,
      actorId,
      timestamp: now.toISOString()
    });

    return { success: true, modifiedCount: result.modifiedCount };
  }

  /**
   * Generates a payroll feed for the given date range.
   */
  async getPayrollFeed(organizationId, startDate, endDate) {
    const records = await AttendanceRecordRepository.find({
      organizationId,
      date: { $gte: startDate, $lte: endDate },
      isFinalized: true
    }, organizationId);

    return records;
  }
}

export default new AttendanceReconciliationService();
