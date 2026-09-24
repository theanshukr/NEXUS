import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '#@/app.js';
import AttendanceRecordRepository from '#@/modules/attendance/repositories/AttendanceRecordRepository.js';
import AttendanceRegularizationRepository from '#@/modules/attendance/repositories/AttendanceRegularizationRepository.js';
import EmployeeRepository from '#@/modules/employees/repositories/EmployeeRepository.js';
import { startDb, clearDb, stopDb } from '../../setup/db.js';
import jwt from 'jsonwebtoken';
import env from '#@/config/env.js';
import cacheService from '#@/platform/cache/index.js';
import AuditService from '#@/modules/audit/services/AuditService.js';
import AuditRepository from '#@/modules/audit/repositories/AuditRepository.js';
import RbacService from '#@/modules/roles/services/RbacService.js';

beforeAll(async () => {
  await startDb();
});

afterAll(async () => {
  await stopDb();
});

describe('M-05 Regularization - Rollback', () => {
  let orgId, managerId, employeeId;
  let managerToken, employeeToken;
  let employeeUser, managerUser;
  let recordId;
  const targetEventId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(async () => {
    vi.clearAllMocks();
    orgId = new mongoose.Types.ObjectId();
    managerId = new mongoose.Types.ObjectId();
    employeeId = new mongoose.Types.ObjectId();

    await EmployeeRepository.model.insertMany([
      { 
        _id: managerId, organizationId: orgId, userId: new mongoose.Types.ObjectId(), 
        status: 'ACTIVE', roleIds: [], departmentId: new mongoose.Types.ObjectId(), 
        locationId: new mongoose.Types.ObjectId(), shiftId: new mongoose.Types.ObjectId(),
        designationId: new mongoose.Types.ObjectId(), firstName: 'Manager', lastName: 'User',
        employeeCode: 'EMP-001', joiningDate: new Date(), workEmail: 'mgr@test.com'
      },
      { 
        _id: employeeId, organizationId: orgId, userId: new mongoose.Types.ObjectId(), 
        managerId: managerId, status: 'ACTIVE', roleIds: [], departmentId: new mongoose.Types.ObjectId(), 
        locationId: new mongoose.Types.ObjectId(), shiftId: new mongoose.Types.ObjectId(),
        designationId: new mongoose.Types.ObjectId(), firstName: 'Employee', lastName: 'User',
        employeeCode: 'EMP-002', joiningDate: new Date(), workEmail: 'emp@test.com'
      }
    ]);

    employeeUser = await EmployeeRepository.findByIdAndTenant(employeeId, orgId);
    managerUser = await EmployeeRepository.findByIdAndTenant(managerId, orgId);

    vi.spyOn(RbacService, 'getEffectivePermissions').mockImplementation(async (uid) => {
      const uidStr = uid.toString();
      if (uidStr === managerUser.userId.toString()) return new Set(['attendance.read', 'attendance.regularization.approve']);
      return new Set(['attendance.mark', 'attendance.regularization.request']);
    });

    const mSessionId = 'sess-m1';
    const eSessionId = 'sess-e1';
    
    managerToken = jwt.sign({ userId: managerUser.userId, organizationId: orgId, sessionId: mSessionId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
    employeeToken = jwt.sign({ userId: employeeUser.userId, organizationId: orgId, sessionId: eSessionId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

    await cacheService.set(`tenant:${orgId}:session:${managerUser.userId}:${mSessionId}`, JSON.stringify({ email: managerUser.workEmail, status: 'ACTIVE' }), 3600);
    await cacheService.set(`tenant:${orgId}:session:${employeeUser.userId}:${eSessionId}`, JSON.stringify({ email: employeeUser.workEmail, status: 'ACTIVE' }), 3600);

    const record = await AttendanceRecordRepository.model.create({
      organizationId: orgId,
      employeeId: employeeId,
      date: '2025-01-10',
      locationId: new mongoose.Types.ObjectId(),
      shiftId: new mongoose.Types.ObjectId(),
      shiftSnapshot: { name: 'Shift', startTime: '09:00', endTime: '18:00', gracePeriodMinutes: 15, isNightShift: false },
      locationSnapshot: { name: 'HQ', timezone: 'Asia/Kolkata' },
      policySnapshot: { minimumWorkingHours: 8, halfDayAfterHours: 4, overtimeStartsAfterHours: 9, lateAfterMinutes: 15 },
      attendanceEvents: [{
        eventId: targetEventId, eventType: 'CLOCK_IN', originalTime: new Date('2025-01-10T10:30:00.000Z'), correctedTime: null
      }],
      workflowStatus: 'NORMAL',
      attendanceStatus: 'LATE'
    });
    recordId = record._id;
  });

  afterEach(async () => {
    await clearDb();
  });

  it('1. ACID Transaction Rollbacks: Audit failure aborts transaction and reverts record', async () => {
    const regReq = await AttendanceRegularizationRepository.createScoped({
      employeeId,
      attendanceRecordId: recordId,
      targetEventId,
      type: 'CLOCK_IN',
      requestedClockIn: new Date('2025-01-10T09:00:00.000Z'),
      reason: 'Issue',
      status: 'PENDING'
    }, orgId);

    // Update workflowStatus so we can simulate the state during pending
    await AttendanceRecordRepository.model.updateOne({ _id: recordId }, { $set: { workflowStatus: 'REGULARIZATION_PENDING' } });

    // Intentionally inject failure inside transaction (Audit logging is the last DB operation in the transaction)
    vi.spyOn(AuditService, 'logAction').mockRejectedValueOnce(new Error('Simulated Audit Failure'));

    const res = await request(app)
      .post(`/api/v1/attendance/regularizations/${regReq._id}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reviewerComments: 'Approve' });

    expect(res.status).toBe(500); // Transaction aborted

    // Verify strict rollback behavior
    const unchangedRecord = await AttendanceRecordRepository.findByIdAndTenant(recordId, orgId);
    expect(unchangedRecord.workflowStatus).toBe('REGULARIZATION_PENDING'); // Remaining pending!
    expect(unchangedRecord.attendanceStatus).toBe('LATE'); // No change
    expect(unchangedRecord.attendanceEvents[0].correctedTime).toBeNull(); // No modification made

    const unchangedReq = await AttendanceRegularizationRepository.findByIdAndTenant(regReq._id, orgId);
    expect(unchangedReq.status).toBe('PENDING'); // Status did not commit to APPROVED

    // Verify Audit log was not created
    const audits = await AuditRepository.model.find({ entityId: regReq._id });
    expect(audits.length).toBe(0);

    // Verify No duplicate events added
    expect(unchangedRecord.attendanceEvents.length).toBe(1);
  });
});
