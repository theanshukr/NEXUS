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
import RbacService from '#@/modules/roles/services/RbacService.js';

beforeAll(async () => {
  await startDb();
});

afterAll(async () => {
  await stopDb();
});

describe('M-05 Regularization - Rejection Flow', () => {
  let orgId, managerId, employeeId;
  let managerToken;
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
      return new Set(['attendance.read', 'attendance.regularization.approve']);
    });

    const mSessionId = 'sess-m1';
    managerToken = jwt.sign({ userId: managerUser.userId, organizationId: orgId, sessionId: mSessionId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
    await cacheService.set(`tenant:${orgId}:session:${managerUser.userId}:${mSessionId}`, JSON.stringify({ email: managerUser.workEmail, status: 'ACTIVE' }), 3600);

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
      workflowStatus: 'REGULARIZATION_PENDING',
      attendanceStatus: 'LATE'
    });
    recordId = record._id;
  });

  afterEach(async () => {
    await clearDb();
  });

  it('1. Rejection when NO other requests exist reverts workflowStatus to NORMAL', async () => {
    const regReq = await AttendanceRegularizationRepository.createScoped({
      employeeId,
      attendanceRecordId: recordId,
      targetEventId,
      type: 'CLOCK_IN',
      requestedClockIn: new Date('2025-01-10T09:00:00.000Z'),
      reason: 'Issue',
      status: 'PENDING'
    }, orgId);

    const res = await request(app)
      .post(`/api/v1/attendance/regularizations/${regReq._id}/reject`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reviewerComments: 'No' });

    expect(res.status).toBe(200);

    const record = await AttendanceRecordRepository.findByIdAndTenant(recordId, orgId);
    expect(record.workflowStatus).toBe('NORMAL');
    expect(record.attendanceStatus).toBe('LATE');
  });

  it('2. Rejection when OTHER requests exist keeps workflowStatus as PENDING', async () => {
    // Current request
    const regReq1 = await AttendanceRegularizationRepository.createScoped({
      employeeId,
      attendanceRecordId: recordId,
      targetEventId,
      type: 'CLOCK_IN',
      requestedClockIn: new Date('2025-01-10T09:00:00.000Z'),
      reason: 'Issue 1',
      status: 'PENDING'
    }, orgId);

    // Another pending request
    await AttendanceRegularizationRepository.createScoped({
      employeeId,
      attendanceRecordId: recordId,
      targetEventId: '223e4567-e89b-12d3-a456-426614174001',
      type: 'CLOCK_OUT',
      requestedClockOut: new Date('2025-01-10T18:00:00.000Z'),
      reason: 'Issue 2',
      status: 'PENDING'
    }, orgId);

    const res = await request(app)
      .post(`/api/v1/attendance/regularizations/${regReq1._id}/reject`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reviewerComments: 'No' });

    expect(res.status).toBe(200);

    const record = await AttendanceRecordRepository.findByIdAndTenant(recordId, orgId);
    expect(record.workflowStatus).toBe('REGULARIZATION_PENDING'); // Remains pending because of second request
  });

  it('3. Rejecting an already rejected request fails gracefully', async () => {
    const regReq = await AttendanceRegularizationRepository.createScoped({
      employeeId,
      attendanceRecordId: recordId,
      targetEventId,
      type: 'CLOCK_IN',
      requestedClockIn: new Date('2025-01-10T09:00:00.000Z'),
      reason: 'Issue',
      status: 'REJECTED'
    }, orgId);

    const res = await request(app)
      .post(`/api/v1/attendance/regularizations/${regReq._id}/reject`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reviewerComments: 'No again' });

    expect(res.status).toBe(409); // Conflict error expected due to optimistic lock
  });
});
