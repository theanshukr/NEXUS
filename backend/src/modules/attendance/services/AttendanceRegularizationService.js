import logger from '#@/platform/logger/index.js';
import AttendanceRegularizationRepository from '../repositories/AttendanceRegularizationRepository.js';
import AttendanceRecordRepository from '../repositories/AttendanceRecordRepository.js';
import EmployeeRepository from '#@/modules/employees/repositories/EmployeeRepository.js';
import AuditService from '#@/modules/audit/services/AuditService.js';
import AttendanceCalculationService from './AttendanceCalculationService.js';
import { runInTransaction } from '#@/platform/database/db.js';
import EventBus from '#@/core/events/EventBus.js';
import EVENTS from '#@/core/constants/events/index.js';
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '#@/core/errors/AppError.js';

export class AttendanceRegularizationService {

  /**
   * Request a regularization for an attendance record.
   * Modifies the AttendanceRecord workflowStatus to REGULARIZATION_PENDING.
   *
   * @param {Object} payload
   * @param {string} payload.attendanceRecordId
   * @param {string} payload.targetEventId - The UUID of the specific event to correct, or null for FULL_DAY
   * @param {string} payload.type - CLOCK_IN, CLOCK_OUT, FULL_DAY
   * @param {Date} payload.requestedClockIn
   * @param {Date} payload.requestedClockOut
   * @param {string} payload.reason
   * @param {string} organizationId
   * @param {string} userId - the user making the request
   * @returns {Promise<Object>} The created regularization request
   */
  async requestRegularization(payload, organizationId, userId) {
    const { attendanceRecordId, targetEventId, type, requestedClockIn, requestedClockOut, reason } = payload;

    const employee = await EmployeeRepository.model.findOne({ userId, organizationId });
    if (!employee) throw new ForbiddenError('Employee profile not found.');
    const employeeId = employee._id;

    // 1. Verify the record exists and belongs to the employee
    const record = await AttendanceRecordRepository.findByIdAndTenant(attendanceRecordId, organizationId);
    if (!record) throw new NotFoundError('Attendance record not found.');
    if (record.employeeId.toString() !== employeeId.toString()) {
      throw new ForbiddenError('You can only request regularization for your own attendance.');
    }
    if (record.isFinalized || record.payrollStatus === 'LOCKED') {
      throw new ConflictError('Cannot request regularization: attendance record is finalized or locked for payroll.');
    }
    if (record.workflowStatus === 'REGULARIZATION_APPROVED') {
      throw new ConflictError('Record is already finalized.');
    }

    // 2. Prevent overlapping pending regularizations for the same event
    const existing = await AttendanceRegularizationRepository.model.findOne({
      attendanceRecordId,
      targetEventId,
      status: 'PENDING',
      organizationId
    });
    if (existing) {
      throw new ConflictError('A pending regularization request already exists for this event.');
    }

    // 3. Validation: The event must actually exist in the record
    if (targetEventId) {
      const event = record.attendanceEvents.find(e => e.eventId === targetEventId);
      if (!event) throw new ValidationError('Target event not found in the attendance record.');
    } else if (type !== 'FULL_DAY') {
      throw new ValidationError('targetEventId is required unless requesting FULL_DAY regularization.');
    }

    // 4. ACID Transaction: Create request & update record status
    const result = await runInTransaction(async (session) => {
      const regularization = await AttendanceRegularizationRepository.createScoped({
        employeeId,
        attendanceRecordId,
        targetEventId,
        type,
        requestedClockIn,
        requestedClockOut,
        reason,
        status: 'PENDING'
      }, organizationId, { session });

      await AttendanceRecordRepository.updateByIdAndTenant(
        attendanceRecordId,
        { workflowStatus: 'REGULARIZATION_PENDING' },
        organizationId,
        { session }
      );

      await AuditService.logAction({
        organizationId,
        actorId: employeeId,
        action: 'ATTENDANCE_REGULARIZATION_REQUESTED',
        entityType: 'AttendanceRegularization',
        entityId: regularization._id,
        newValue: { type, targetEventId, reason },
        session
      });

      return regularization;
    });

    EventBus.emit(EVENTS.ATTENDANCE.REGULARIZATION_REQUESTED, {
      regularizationId: result._id,
      recordId: attendanceRecordId,
      employeeId,
      organizationId
    });

    return result;
  }

  /**
   * Approve a regularization request.
   * Updates the event's correctedTime, recalculates hours/status, and marks workflowStatus as REGULARIZATION_APPROVED.
   *
   * @param {string} id - Regularization ID
   * @param {string} reviewerComments
   * @param {string} organizationId
   * @param {string} reviewerId - Manager or HR approving
   */
  async approveRegularization(id, reviewerComments, organizationId, reviewerId) {
    const now = new Date();

    const result = await runInTransaction(async (session) => {
      // 1. Verify existence first for accurate 404
      const existingReq = await AttendanceRegularizationRepository.findByIdAndTenant(id, organizationId, { session });
      if (!existingReq) throw new NotFoundError('Regularization request not found.');

      // 2. Optimistic concurrency lock: atomic update only if PENDING
      const request = await AttendanceRegularizationRepository.model.findOneAndUpdate(
        { _id: id, organizationId, status: 'PENDING' },
        { status: 'APPROVED', reviewerComments, reviewedBy: reviewerId, reviewedAt: now },
        { new: true, session }
      );
      if (!request) throw new ConflictError(`Request is already ${existingReq.status}.`);

      const record = await AttendanceRecordRepository.findByIdAndTenant(request.attendanceRecordId, organizationId);
      if (!record) throw new NotFoundError('Underlying attendance record no longer exists.');
      if (record.isFinalized || record.payrollStatus === 'LOCKED') {
        throw new ConflictError('Cannot approve regularization: attendance record is finalized or locked for payroll.');
      }

      // 1. Clone and modify attendanceEvents safely as plain objects
      const updatedEvents = record.attendanceEvents.map(e => (e.toObject ? e.toObject() : e));

      if (request.type === 'FULL_DAY') {
        // Full day correction — usually means they missed clock in and out entirely,
        // or we wipe the timeline and replace it with a simulated clock in/out.
        const inEvent = updatedEvents.find(e => e.eventType === 'CLOCK_IN');
        if (inEvent && request.requestedClockIn) {
          inEvent.correctedTime = request.requestedClockIn;
        } else if (!inEvent && request.requestedClockIn) {
          updatedEvents.push({
            eventId: `reg-${Date.now()}-in`,
            eventType: 'CLOCK_IN',
            originalTime: request.requestedClockIn,
            correctedTime: request.requestedClockIn,
            coordinates: { lat: 0, lng: 0 },
            geofence: { status: 'VALID', distanceFromOfficeMeters: 0, gpsAccuracyMeters: 0 },
            device: { platform: 'REGULARIZATION' }
          });
        }
        
        const outEvent = updatedEvents.find(e => e.eventType === 'CLOCK_OUT');
        if (outEvent && request.requestedClockOut) {
          outEvent.correctedTime = request.requestedClockOut;
        } else if (!outEvent && request.requestedClockOut) {
          updatedEvents.push({
            eventId: `reg-${Date.now()}-out`,
            eventType: 'CLOCK_OUT',
            originalTime: request.requestedClockOut,
            correctedTime: request.requestedClockOut,
            coordinates: { lat: 0, lng: 0 },
            geofence: { status: 'VALID', distanceFromOfficeMeters: 0, gpsAccuracyMeters: 0 },
            device: { platform: 'REGULARIZATION' }
          });
        }
      } else {
        // Specific event targeted
        const eventIndex = updatedEvents.findIndex(e => e.eventId === request.targetEventId);
        if (eventIndex !== -1) {
          updatedEvents[eventIndex] = {
            ...updatedEvents[eventIndex],
            correctedTime: request.type === 'CLOCK_IN' ? request.requestedClockIn : request.requestedClockOut
          };
        }
      }

      // 3. Recalculate hours and status based on the modified events
      const calcCtx = {
        shiftSnapshot: record.shiftSnapshot,
        locationSnapshot: record.locationSnapshot,
        policySnapshot: record.policySnapshot,
        attendanceEvents: updatedEvents,
        date: record.date
      };
      const { attendanceStatus, workingHours, overtimeHours } = AttendanceCalculationService.calculate(calcCtx);

      // 4. Update the AttendanceRecord
      await AttendanceRecordRepository.updateByIdAndTenant(
        record._id,
        {
          attendanceEvents: updatedEvents,
          workingHours,
          overtimeHours,
          attendanceStatus,
          workflowStatus: 'REGULARIZATION_APPROVED',
          correctionDetails: {
            reason: request.reason,
            correctedBy: reviewerId,
            correctedAt: now
          }
        },
        organizationId,
        { session }
      );

      // 5. Audit Log
      await AuditService.logAction({
        organizationId,
        actorId: reviewerId,
        action: 'ATTENDANCE_REGULARIZATION_APPROVED',
        entityType: 'AttendanceRegularization',
        entityId: request._id,
        newValue: { workingHours, attendanceStatus },
        session
      });

      return request;
    });

    logger.info({ organizationId, regularizationId: id }, 'Regularization approved');

    EventBus.emit(EVENTS.ATTENDANCE.REGULARIZATION_APPROVED, {
      regularizationId: id,
      recordId: result.attendanceRecordId,
      employeeId: result.employeeId,
      organizationId,
      timestamp: now.toISOString()
    });

    return result;
  }

  /**
   * Reject a regularization request.
   * Updates the status to REJECTED and reverts the record's workflowStatus if no other pending requests exist.
   */
  async rejectRegularization(id, reviewerComments, organizationId, reviewerId) {
    const now = new Date();

    const result = await runInTransaction(async (session) => {
      // 1. Verify existence first for accurate 404
      const existingReq = await AttendanceRegularizationRepository.findByIdAndTenant(id, organizationId, { session });
      if (!existingReq) throw new NotFoundError('Regularization request not found.');

      const record = await AttendanceRecordRepository.findByIdAndTenant(existingReq.attendanceRecordId, organizationId, { session });
      if (record && (record.isFinalized || record.payrollStatus === 'LOCKED')) {
        throw new ConflictError('Cannot reject regularization: attendance record is finalized or locked for payroll.');
      }

      // 2. Optimistic concurrency lock: atomic update only if PENDING
      const request = await AttendanceRegularizationRepository.model.findOneAndUpdate(
        { _id: id, organizationId, status: 'PENDING' },
        { status: 'REJECTED', reviewerComments, reviewedBy: reviewerId, reviewedAt: now },
        { new: true, session }
      );
      if (!request) throw new ConflictError(`Request is already ${existingReq.status}.`);

      // Check if the record has any OTHER pending regularizations
      const pendingCount = await AttendanceRegularizationRepository.countDocuments({
        attendanceRecordId: request.attendanceRecordId,
        status: 'PENDING',
        _id: { $ne: id }
      }, organizationId, { session });

      if (pendingCount === 0) {
        // Revert workflow status to NORMAL
        await AttendanceRecordRepository.updateByIdAndTenant(
          request.attendanceRecordId,
          { workflowStatus: 'NORMAL' },
          organizationId,
          { session }
        );
      }

      await AuditService.logAction({
        organizationId,
        actorId: reviewerId,
        action: 'ATTENDANCE_REGULARIZATION_REJECTED',
        entityType: 'AttendanceRegularization',
        entityId: id,
        newValue: { status: 'REJECTED' },
        session
      });

      return request;
    });

    EventBus.emit(EVENTS.ATTENDANCE.REGULARIZATION_REJECTED, {
      regularizationId: id,
      recordId: result.attendanceRecordId,
      employeeId: result.employeeId,
      organizationId,
      timestamp: now.toISOString()
    });

    return result;
  }
}

export default new AttendanceRegularizationService();
