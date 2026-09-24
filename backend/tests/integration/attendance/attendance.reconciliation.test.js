import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '#@/app.js';
import AttendanceRecordRepository from '#@/modules/attendance/repositories/AttendanceRecordRepository.js';
import EmployeeRepository from '#@/modules/employees/repositories/EmployeeRepository.js';
import AttendanceReconciliationService from '#@/modules/attendance/services/AttendanceReconciliationService.js';
import AttendanceClockService from '#@/modules/attendance/services/AttendanceClockService.js';
import AttendanceRegularizationService from '#@/modules/attendance/services/AttendanceRegularizationService.js';
import { startDb, clearDb, stopDb } from '../../setup/db.js';
import jwt from 'jsonwebtoken';
import env from '#@/config/env.js';
import cacheService from '#@/platform/cache/index.js';
import EventBus from '#@/core/events/EventBus.js';
import { EVENTS } from '#@/core/constants/events/index.js';
import RbacService from '#@/modules/roles/services/RbacService.js';
import { ConflictError, NotFoundError } from '#@/core/errors/AppError.js';

beforeAll(async () => {
  await startDb();
});

afterAll(async () => {
  await stopDb();
});

describe('M-05.5 Attendance Reconciliation & Payroll Engine Contract', () => {
  let orgId, adminId, employeeId;
  let adminToken, employeeToken;
  let adminUser, employeeUser;

  beforeEach(async () => {
    await clearDb();
    vi.clearAllMocks();
    vi.spyOn(EventBus, 'emit');

    orgId = new mongoose.Types.ObjectId();
    adminId = new mongoose.Types.ObjectId();
    employeeId = new mongoose.Types.ObjectId();

    await EmployeeRepository.model.insertMany([
      {
        _id: adminId, organizationId: orgId, userId: new mongoose.Types.ObjectId(),
        status: 'ACTIVE', roleIds: [], departmentId: new mongoose.Types.ObjectId(),
        locationId: new mongoose.Types.ObjectId(), shiftId: new mongoose.Types.ObjectId(),
        designationId: new mongoose.Types.ObjectId(), firstName: 'Admin', lastName: 'User',
        employeeCode: 'ADM-001', joiningDate: new Date(), workEmail: 'admin@test.com'
      },
      {
        _id: employeeId, organizationId: orgId, userId: new mongoose.Types.ObjectId(),
        status: 'ACTIVE', roleIds: [], departmentId: new mongoose.Types.ObjectId(),
        locationId: new mongoose.Types.ObjectId(), shiftId: new mongoose.Types.ObjectId(),
        designationId: new mongoose.Types.ObjectId(), firstName: 'Employee', lastName: 'User',
        employeeCode: 'EMP-001', joiningDate: new Date(), workEmail: 'employee@test.com'
      }
    ]);

    adminUser = await EmployeeRepository.findByIdAndTenant(adminId, orgId);
    employeeUser = await EmployeeRepository.findByIdAndTenant(employeeId, orgId);

    vi.spyOn(RbacService, 'getEffectivePermissions').mockImplementation(async (uid) => {
      if (uid === adminUser.userId.toString()) return new Set(['attendance.reconcile', 'attendance.finalize', 'attendance.payroll_feed', 'attendance.mark', 'attendance.regularization.approve']);
      if (uid === employeeUser.userId.toString()) return new Set(['attendance.mark', 'attendance.regularization.request']);
      return new Set();
    });

    const adminSessionId = 'fake-session-admin';
    const empSessionId = 'fake-session-emp';

    adminToken = jwt.sign({ userId: adminUser.userId, organizationId: orgId, sessionId: adminSessionId, permissions: ['attendance.reconcile', 'attendance.finalize', 'attendance.payroll_feed'] }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
    employeeToken = jwt.sign({ userId: employeeUser.userId, organizationId: orgId, sessionId: empSessionId, permissions: ['attendance.mark', 'attendance.regularization.request'] }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

    await cacheService.set(`tenant:${orgId}:session:${adminUser.userId}:${adminSessionId}`, JSON.stringify({ email: 'admin@test.com', status: 'ACTIVE' }), 3600);
    await cacheService.set(`tenant:${orgId}:session:${employeeUser.userId}:${empSessionId}`, JSON.stringify({ email: 'employee@test.com', status: 'ACTIVE' }), 3600);
  });

  describe('1. EOD Stale Session Reconciliation', () => {
    it('reconciles open sessions exceeding maximum open attendance hours', async () => {
      const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000);
      const record = await AttendanceRecordRepository.createScoped({
        employeeId,
        date: '2026-07-01',
        shiftId: new mongoose.Types.ObjectId(),
        shiftSnapshot: { startTime: '09:00', endTime: '18:00', gracePeriodMinutes: 15 },
        locationId: new mongoose.Types.ObjectId(),
        locationSnapshot: { timezone: 'UTC' },
        policySnapshot: { maximumOpenAttendanceHours: 16 },
        attendanceEvents: [{
          eventId: 'event-1',
          eventType: 'CLOCK_IN',
          originalTime: twentyHoursAgo,
          coordinates: { lat: 0, lng: 0 },
          geofence: { status: 'VALID' }
        }],
        attendanceStatus: 'PRESENT',
        workflowStatus: 'NORMAL',
        workingHours: 0,
        overtimeHours: 0
      }, orgId);

      const summary = await AttendanceReconciliationService.reconcileStaleSessions(orgId);
      expect(summary.reconciledCount).toBe(1);
      expect(summary.records).toContainEqual(record._id);

      const updated = await AttendanceRecordRepository.findByIdAndTenant(record._id, orgId);
      expect(updated.attendanceStatus).toBe('MISSING_CLOCK_OUT');
      expect(updated.workingHours).toBe(0);
      expect(updated.workflowStatus).toBe('RECONCILIATION_REQUIRED');

      expect(EventBus.emit).toHaveBeenCalledWith(EVENTS.ATTENDANCE.RECORD_RECONCILED, expect.objectContaining({
        recordId: record._id,
        employeeId
      }));
      expect(EventBus.emit).toHaveBeenCalledWith(EVENTS.ATTENDANCE.RECONCILIATION_COMPLETED, expect.objectContaining({
        reconciledCount: 1
      }));
    });
  });

  describe('2. Pay Period Finalization & Idempotency', () => {
    it('blocks finalization if any incomplete attendance sessions exist', async () => {
      await AttendanceRecordRepository.createScoped({
        employeeId,
        date: '2026-07-01',
        shiftId: new mongoose.Types.ObjectId(),
        locationId: new mongoose.Types.ObjectId(),
        attendanceEvents: [{ eventId: '1', eventType: 'CLOCK_IN', originalTime: new Date() }, { eventId: '2', eventType: 'CLOCK_OUT', originalTime: new Date() }],
        workflowStatus: 'REGULARIZATION_PENDING',
        attendanceStatus: 'PRESENT',
        workingHours: 8,
        overtimeHours: 0
      }, orgId);

      await expect(
        AttendanceReconciliationService.finalizePayPeriod(orgId, '2026-07-01', '2026-07-05', adminUser.userId)
      ).rejects.toThrow(ConflictError);
    });

    it('atomically finalizes pay period and guarantees idempotency on replay', async () => {
      await AttendanceRecordRepository.createScoped({
        employeeId,
        date: '2026-07-02',
        shiftId: new mongoose.Types.ObjectId(),
        locationId: new mongoose.Types.ObjectId(),
        attendanceEvents: [{ eventId: '1', eventType: 'CLOCK_IN', originalTime: new Date() }, { eventId: '2', eventType: 'CLOCK_OUT', originalTime: new Date() }],
        workflowStatus: 'NORMAL',
        attendanceStatus: 'PRESENT',
        workingHours: 8,
        overtimeHours: 0
      }, orgId);

      const res1 = await AttendanceReconciliationService.finalizePayPeriod(orgId, '2026-07-01', '2026-07-05', adminUser.userId);
      expect(res1.success).toBe(true);
      expect(res1.alreadyFinalized).toBe(false);
      expect(res1.finalizedCount).toBe(1);

      expect(EventBus.emit).toHaveBeenCalledWith(EVENTS.ATTENDANCE.PAY_PERIOD_FINALIZED, expect.objectContaining({
        recordCount: 1
      }));

      const res2 = await AttendanceReconciliationService.finalizePayPeriod(orgId, '2026-07-01', '2026-07-05', adminUser.userId);
      expect(res2.success).toBe(true);
      expect(res2.alreadyFinalized).toBe(true);
      expect(res2.finalizedCount).toBe(0);
    });
  });

  describe('3. Immutability Guards', () => {
    it('blocks clocking out or regularization requests when record is finalized', async () => {
      const record = await AttendanceRecordRepository.createScoped({
        employeeId,
        date: '2026-07-03',
        shiftId: new mongoose.Types.ObjectId(),
        locationId: new mongoose.Types.ObjectId(),
        attendanceEvents: [{ eventId: '1', eventType: 'CLOCK_IN', originalTime: new Date() }],
        workflowStatus: 'NORMAL',
        attendanceStatus: 'PRESENT',
        workingHours: 0,
        overtimeHours: 0,
        isFinalized: true
      }, orgId);

      await expect(
        AttendanceClockService.clockOut({ userId: employeeUser.userId, gpsData: { lat: 0, lng: 0 }, deviceData: {}, organizationId: orgId })
      ).rejects.toThrow(ConflictError);

      await expect(
        AttendanceRegularizationService.requestRegularization({
          attendanceRecordId: record._id,
          type: 'FULL_DAY',
          reason: 'Correction'
        }, orgId, employeeUser.userId)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('4. Single Source Transition Validator Kernel & Payroll State Machine', () => {
    it('enforces strict payroll status jumps and emits lifecycle events', async () => {
      await AttendanceRecordRepository.createScoped({
        employeeId,
        date: '2026-07-04',
        shiftId: new mongoose.Types.ObjectId(),
        locationId: new mongoose.Types.ObjectId(),
        attendanceEvents: [{ eventId: '1', eventType: 'CLOCK_IN', originalTime: new Date() }, { eventId: '2', eventType: 'CLOCK_OUT', originalTime: new Date() }],
        workflowStatus: 'NORMAL',
        attendanceStatus: 'PRESENT',
        workingHours: 8,
        overtimeHours: 0,
        isFinalized: true,
        payrollStatus: 'NOT_PROCESSED'
      }, orgId);

      // NOT_PROCESSED -> PROCESSING
      await AttendanceReconciliationService.markPayrollProcessing(orgId, '2026-07-01', '2026-07-05', 'RUN-101', adminUser.userId);
      expect(EventBus.emit).toHaveBeenCalledWith(EVENTS.ATTENDANCE.PAYROLL_PROCESSING_STARTED, expect.objectContaining({
        payrollRunId: 'RUN-101'
      }));

      // Invalid jump: PROCESSING -> LOCKED should fail
      await expect(
        AttendanceReconciliationService.lockPayPeriod(orgId, '2026-07-01', '2026-07-05', 'RUN-101', adminUser.userId)
      ).rejects.toThrow(ConflictError);
      expect(EventBus.emit).toHaveBeenCalledWith(EVENTS.ATTENDANCE.PAYROLL_STATE_VALIDATION_FAILED, expect.any(Object));

      // PROCESSING -> PROCESSED
      await AttendanceReconciliationService.markPayrollProcessed(orgId, '2026-07-01', '2026-07-05', 'RUN-101', adminUser.userId);
      expect(EventBus.emit).toHaveBeenCalledWith(EVENTS.ATTENDANCE.PAYROLL_PROCESSED, expect.objectContaining({
        payrollRunId: 'RUN-101'
      }));

      // PROCESSED -> LOCKED
      await AttendanceReconciliationService.lockPayPeriod(orgId, '2026-07-01', '2026-07-05', 'RUN-101', adminUser.userId);
      expect(EventBus.emit).toHaveBeenCalledWith(EVENTS.ATTENDANCE.PAYROLL_LOCKED, expect.objectContaining({
        payrollRunId: 'RUN-101'
      }));
    });
  });

  describe('5. REST API Controller Integration', () => {
    it('returns administrative payroll feed via GET /api/v1/attendance/reconciliation/payroll-feed', async () => {
      await AttendanceRecordRepository.createScoped({
        employeeId,
        date: '2026-07-05',
        shiftId: new mongoose.Types.ObjectId(),
        locationId: new mongoose.Types.ObjectId(),
        attendanceEvents: [{ eventId: '1', eventType: 'CLOCK_IN', originalTime: new Date() }, { eventId: '2', eventType: 'CLOCK_OUT', originalTime: new Date() }],
        workflowStatus: 'NORMAL',
        attendanceStatus: 'PRESENT',
        workingHours: 8,
        overtimeHours: 0,
        isFinalized: true,
        payrollStatus: 'NOT_PROCESSED'
      }, orgId);

      const res = await request(app)
        .get('/api/v1/attendance/reconciliation/payroll-feed?startDate=2026-07-01&endDate=2026-07-31')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        employeeId: employeeId.toString(),
        date: '2026-07-05',
        isFinalized: true,
        payrollStatus: 'NOT_PROCESSED'
      });
    });
  });
});
