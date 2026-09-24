import LeaveRequestRepository from '../repositories/LeaveRequestRepository.js';
import LeaveBalanceRepository from '../repositories/LeaveBalanceRepository.js';
import LeaveBalanceLedgerRepository from '../repositories/LeaveBalanceLedgerRepository.js';
import LeavePolicyRepository from '../repositories/LeavePolicyRepository.js';
import LeaveBalanceService from '../services/LeaveBalanceService.js';
import CalendarService from '#@/modules/calendar/services/CalendarService.js';
import { runInTransaction } from '#@/platform/database/db.js';
import { ValidationError, ConflictError, NotFoundError } from '#@/core/errors/AppError.js';
import EventBus from '#@/core/events/EventBus.js';
import EVENTS from '#@/core/constants/events/index.js';
import AuditService from '#@/modules/audit/services/AuditService.js';

class LeaveRequestService {
  async submitRequest(organizationId, employeeId, payload) {
    return await runInTransaction(async (session) => {
      const { leaveCode, startDate, endDate, isHalfDay, halfDayPeriod, reason, attachmentIds, locationId } = payload;
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      const year = start.getFullYear();

      // Ensure balance exists
      await LeaveBalanceService.getOrInitializeBalance(organizationId, employeeId, year);

      // Check overlapping
      const overlapping = await LeaveRequestRepository.findOverlappingActiveRequests(organizationId, employeeId, start, end);
      if (overlapping.length > 0) {
        throw new ConflictError('Leave request overlaps with an existing pending or approved request.');
      }

      const policy = await LeavePolicyRepository.findActiveByCode(organizationId, leaveCode);
      if (!policy) throw new NotFoundError(`Active leave policy for code ${leaveCode} not found.`);

      // Calculate net days
      let totalDays = await CalendarService.calculateNetWorkingDays(organizationId, start, end, locationId);
      if (isHalfDay && totalDays === 1) {
        totalDays = 0.5;
      } else if (isHalfDay) {
        throw new ValidationError('Half day is only allowed for single-day requests.');
      }

      if (totalDays <= 0) throw new ValidationError('Net working days is zero (selected days are weekends or holidays).');

      // Validation Rules
      if (policy.escalationRules.requireDocuments && totalDays >= policy.escalationRules.minConsecutiveDaysForDoc) {
        if (!attachmentIds || attachmentIds.length === 0) {
          throw new ValidationError(`${leaveCode} requires document attachments for requests of ${policy.escalationRules.minConsecutiveDaysForDoc} days or more.`);
        }
      }

      // Escalation
      const escalatedToHr = policy.escalationRules.requireHrApproval || (totalDays > policy.escalationRules.managerApprovalLimit);
      const currentApproverRole = escalatedToHr ? 'HR_MANAGER' : 'MANAGER';

      let request = null;

      // Lock and update balance
      await LeaveBalanceRepository.mutateBalanceWithLock(organizationId, employeeId, year, async (lockedBalance) => {
        const b = lockedBalance.balances.find(x => x.code === leaveCode);
        if (!b) throw new NotFoundError(`No balance initialized for code ${leaveCode}.`);

        const available = b.accrued + b.carryForward - b.used - b.pending;
        if (available < totalDays) {
          throw new ValidationError(`Insufficient balance. Requested: ${totalDays}, Available: ${available}`);
        }

        const prevPending = b.pending;
        b.pending += totalDays;

        // Ledger entry
        await LeaveBalanceLedgerRepository.append(organizationId, {
          employeeId,
          leavePolicyId: policy._id,
          leavePolicyVersion: policy.version,
          leaveCode,
          year,
          eventType: 'LEAVE_REQUESTED',
          daysDelta: totalDays,
          previousBalance: { accrued: b.accrued, used: b.used, pending: prevPending, carryForward: b.carryForward },
          newBalance: { accrued: b.accrued, used: b.used, pending: b.pending, carryForward: b.carryForward },
          actorId: employeeId,
          reason: 'Leave request submission'
        }, session);

      }, session);

      // Create Request
      request = await LeaveRequestRepository.createScoped({
        employeeId,
        leavePolicyId: policy._id,
        leavePolicyVersion: policy.version,
        policySnapshot: policy.toObject(),
        leaveCode,
        startDate: start,
        endDate: end,
        totalDays,
        isHalfDay,
        halfDayPeriod,
        reason,
        attachmentIds: attachmentIds || [],
        status: 'PENDING',
        currentApproverRole,
        escalatedToHr
      }, organizationId, { session });

      await AuditService.logAction({
        organizationId,
        actorId: employeeId,
        action: 'LEAVE_SUBMITTED',
        entityType: 'LeaveRequest',
        entityId: request._id
      }, { session });

      return request;
    });
  }

  async approveRequest(organizationId, requestId, actorId) {
    return await runInTransaction(async (session) => {
      const request = await LeaveRequestRepository.findByIdAndTenant(requestId, organizationId, { session });
      if (!request) throw new NotFoundError('Leave request not found.');

      if (request.status === 'APPROVED') return request; // Idempotent
      if (request.status !== 'PENDING') throw new ConflictError(`Cannot approve request in ${request.status} status.`);

      const year = request.startDate.getFullYear();

      await LeaveBalanceRepository.mutateBalanceWithLock(organizationId, request.employeeId, year, async (lockedBalance) => {
        const b = lockedBalance.balances.find(x => x.code === request.leaveCode);
        if (!b) throw new NotFoundError(`Balance missing for code ${request.leaveCode}.`);

        const prevPending = b.pending;
        const prevUsed = b.used;

        b.pending -= request.totalDays;
        b.used += request.totalDays;

        await LeaveBalanceLedgerRepository.append(organizationId, {
          employeeId: request.employeeId,
          leavePolicyId: request.leavePolicyId,
          leavePolicyVersion: request.leavePolicyVersion,
          leaveCode: request.leaveCode,
          year,
          eventType: 'LEAVE_APPROVED',
          daysDelta: request.totalDays,
          previousBalance: { accrued: b.accrued, used: prevUsed, pending: prevPending, carryForward: b.carryForward },
          newBalance: { accrued: b.accrued, used: b.used, pending: b.pending, carryForward: b.carryForward },
          referenceId: request._id,
          actorId,
          reason: 'Manager Approval'
        }, session);
      }, session);

      const updated = await LeaveRequestRepository.updateByIdAndTenant(request._id, {
        status: 'APPROVED',
        approvedBy: actorId,
        approvedAt: new Date()
      }, organizationId, { session, returnDocument: 'after' });

      EventBus.emit(EVENTS.LEAVE?.APPROVED || 'LEAVE.APPROVED', {
        organizationId,
        employeeId: request.employeeId,
        leaveRequestId: request._id,
        leaveCode: request.leaveCode,
        startDate: request.startDate,
        endDate: request.endDate,
        totalDays: request.totalDays,
        isHalfDay: request.isHalfDay,
        halfDayPeriod: request.halfDayPeriod
      });

      await AuditService.logAction({
        organizationId,
        actorId,
        action: 'LEAVE_APPROVED',
        entityType: 'LeaveRequest',
        entityId: request._id
      }, { session });

      return updated;
    });
  }

  async rejectRequest(organizationId, requestId, rejectionReason, actorId) {
    return await runInTransaction(async (session) => {
      const request = await LeaveRequestRepository.findByIdAndTenant(requestId, organizationId, { session });
      if (!request) throw new NotFoundError('Leave request not found.');

      if (request.status === 'REJECTED') return request; // Idempotent
      if (request.status !== 'PENDING') throw new ConflictError(`Cannot reject request in ${request.status} status.`);

      const year = request.startDate.getFullYear();

      await LeaveBalanceRepository.mutateBalanceWithLock(organizationId, request.employeeId, year, async (lockedBalance) => {
        const b = lockedBalance.balances.find(x => x.code === request.leaveCode);
        if (!b) throw new NotFoundError(`Balance missing for code ${request.leaveCode}.`);

        const prevPending = b.pending;
        b.pending -= request.totalDays;

        await LeaveBalanceLedgerRepository.append(organizationId, {
          employeeId: request.employeeId,
          leavePolicyId: request.leavePolicyId,
          leavePolicyVersion: request.leavePolicyVersion,
          leaveCode: request.leaveCode,
          year,
          eventType: 'LEAVE_REJECTED',
          daysDelta: -request.totalDays,
          previousBalance: { accrued: b.accrued, used: b.used, pending: prevPending, carryForward: b.carryForward },
          newBalance: { accrued: b.accrued, used: b.used, pending: b.pending, carryForward: b.carryForward },
          referenceId: request._id,
          actorId,
          reason: rejectionReason || 'Manager Rejection'
        }, session);
      }, session);

      const updated = await LeaveRequestRepository.updateByIdAndTenant(request._id, {
        status: 'REJECTED',
        rejectionReason,
        approvedBy: actorId,
        approvedAt: new Date()
      }, organizationId, { session, returnDocument: 'after' });

      await AuditService.logAction({
        organizationId,
        actorId,
        action: 'LEAVE_REJECTED',
        entityType: 'LeaveRequest',
        entityId: request._id
      }, { session });

      return updated;
    });
  }

  async cancelRequest(organizationId, requestId, actorId) {
    return await runInTransaction(async (session) => {
      const request = await LeaveRequestRepository.findByIdAndTenant(requestId, organizationId, { session });
      if (!request) throw new NotFoundError('Leave request not found.');

      if (request.status === 'CANCELLED') return request; // Idempotent
      if (request.status === 'REJECTED') throw new ConflictError('Cannot cancel a rejected request.');

      const isApproved = request.status === 'APPROVED';
      const year = request.startDate.getFullYear();

      await LeaveBalanceRepository.mutateBalanceWithLock(organizationId, request.employeeId, year, async (lockedBalance) => {
        const b = lockedBalance.balances.find(x => x.code === request.leaveCode);
        if (!b) throw new NotFoundError(`Balance missing for code ${request.leaveCode}.`);

        const prevPending = b.pending;
        const prevUsed = b.used;

        if (isApproved) {
          b.used -= request.totalDays;
        } else {
          b.pending -= request.totalDays;
        }

        await LeaveBalanceLedgerRepository.append(organizationId, {
          employeeId: request.employeeId,
          leavePolicyId: request.leavePolicyId,
          leavePolicyVersion: request.leavePolicyVersion,
          leaveCode: request.leaveCode,
          year,
          eventType: 'LEAVE_CANCELLED',
          daysDelta: -request.totalDays,
          previousBalance: { accrued: b.accrued, used: prevUsed, pending: prevPending, carryForward: b.carryForward },
          newBalance: { accrued: b.accrued, used: b.used, pending: b.pending, carryForward: b.carryForward },
          referenceId: request._id,
          actorId,
          reason: 'Employee Cancellation'
        }, session);
      }, session);

      const updated = await LeaveRequestRepository.updateByIdAndTenant(request._id, {
        status: 'CANCELLED'
      }, organizationId, { session, returnDocument: 'after' });

      if (isApproved) {
        EventBus.emit(EVENTS.LEAVE?.CANCELLED || 'LEAVE.CANCELLED', {
          organizationId,
          employeeId: request.employeeId,
          leaveRequestId: request._id,
          leaveCode: request.leaveCode,
          startDate: request.startDate,
          endDate: request.endDate
        });
      }

      await AuditService.logAction({
        organizationId,
        actorId,
        action: 'LEAVE_CANCELLED',
        entityType: 'LeaveRequest',
        entityId: request._id
      }, { session });

      return updated;
    });
  }
  async handleAttendanceConflictResolution(payload) {
    const { organizationId, employeeId, leaveRequestId, resolutionType, resolutionNotes, resolvedBy } = payload;
    if (!leaveRequestId) return; // Not related to a specific leave

    await runInTransaction(async (session) => {
      const request = await LeaveRequestRepository.findByIdAndTenant(leaveRequestId, organizationId, { session });
      if (!request) return;

      const year = new Date(request.startDate).getFullYear();

      // "KEEP_LEAVE" -> The leave remains approved, no ledger changes.
      // "KEEP_ATTENDANCE" -> The leave must be cancelled/reversed to restore balances.
      if (resolutionType === 'KEEP_ATTENDANCE' && request.status === 'APPROVED') {
        // Reverse ledger
        let prevPending = 0, prevUsed = 0, b = null;
        await LeaveBalanceRepository.mutateBalanceWithLock(organizationId, employeeId, year, async (lockedBalance) => {
          b = lockedBalance.balances.find(x => x.code === request.leaveCode);
          if (b) {
            prevPending = b.pending;
            prevUsed = b.used;
            b.used -= request.totalDays;
          }
        }, session);

        if (b) {
          await LeaveBalanceLedgerRepository.append(organizationId, {
            employeeId,
            leavePolicyId: request.leavePolicyId,
            leavePolicyVersion: request.leavePolicyVersion,
            leaveCode: request.leaveCode,
            year,
            eventType: 'LEAVE_CANCELLED',
            daysDelta: -request.totalDays,
            previousBalance: { accrued: b.accrued, used: prevUsed, pending: prevPending, carryForward: b.carryForward },
            newBalance: { accrued: b.accrued, used: b.used, pending: b.pending, carryForward: b.carryForward },
            referenceId: request._id,
            actorId: resolvedBy || employeeId,
            reason: `Attendance Conflict Resolution: ${resolutionNotes || 'Leave reversed in favor of attendance.'}`
          }, session);
        }

        await LeaveRequestRepository.updateByIdAndTenant(request._id, {
          status: 'CANCELLED',
          rejectionReason: `Cancelled by HR due to attendance conflict: ${resolutionNotes}`
        }, organizationId, { session });

        await AuditService.logAction({
          organizationId,
          actorId: resolvedBy || employeeId,
          action: 'LEAVE_CONFLICT_RESOLVED_CANCELLED',
          entityType: 'LeaveRequest',
          entityId: request._id
        }, { session });
      }

      // "SPLIT_DAY" -> Keep attendance for half, leave for half
      if (resolutionType === 'SPLIT_DAY' && request.status === 'APPROVED' && !request.isHalfDay && request.totalDays === 1) {
        // Reverse 0.5 days
        let prevPending = 0, prevUsed = 0, b = null;
        await LeaveBalanceRepository.mutateBalanceWithLock(organizationId, employeeId, year, async (lockedBalance) => {
          b = lockedBalance.balances.find(x => x.code === request.leaveCode);
          if (b) {
            prevPending = b.pending;
            prevUsed = b.used;
            b.used -= 0.5;
          }
        }, session);

        if (b) {
          await LeaveBalanceLedgerRepository.append(organizationId, {
            employeeId,
            leavePolicyId: request.leavePolicyId,
            leavePolicyVersion: request.leavePolicyVersion,
            leaveCode: request.leaveCode,
            year,
            eventType: 'MANUAL_ADJUSTMENT',
            daysDelta: -0.5,
            previousBalance: { accrued: b.accrued, used: prevUsed, pending: prevPending, carryForward: b.carryForward },
            newBalance: { accrued: b.accrued, used: b.used, pending: b.pending, carryForward: b.carryForward },
            referenceId: request._id,
            actorId: resolvedBy || employeeId,
            reason: `Attendance Conflict Resolution (SPLIT_DAY): ${resolutionNotes || 'Leave reduced by 0.5 days.'}`
          }, session);
        }

        await LeaveRequestRepository.updateByIdAndTenant(request._id, {
          isHalfDay: true,
          totalDays: 0.5
        }, organizationId, { session });

        await AuditService.logAction({
          organizationId,
          actorId: resolvedBy || employeeId,
          action: 'LEAVE_CONFLICT_RESOLVED_SPLIT',
          entityType: 'LeaveRequest',
          entityId: request._id
        }, { session });
      }
    });
  }

  async getEmployeeRequests(organizationId, employeeId, filter = {}, pagination = { skip: 0, limit: 50 }) {
    return await LeaveRequestRepository.find({
      ...filter,
      employeeId
    }, organizationId, {
      sort: { createdAt: -1 },
      skip: pagination.skip,
      limit: pagination.limit,
      populate: [
        { path: 'leavePolicyId', select: 'name code' }
      ]
    });
  }

  async getTenantRequests(organizationId, filter = {}, pagination = { skip: 0, limit: 50 }) {
    const items = await LeaveRequestRepository.find(filter, organizationId, {
      sort: { createdAt: -1 },
      skip: pagination.skip,
      limit: pagination.limit,
      populate: [
        { path: 'employeeId', select: 'firstName lastName email' },
        { path: 'leavePolicyId', select: 'name code' }
      ]
    });
    return { items, total: items.length }; // Note: naive pagination
  }
}

export default new LeaveRequestService();
