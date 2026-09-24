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
import AuditRepository from '#@/modules/audit/repositories/AuditRepository.js';
import RbacService from '#@/modules/roles/services/RbacService.js';

beforeAll(async () => {
  await startDb();
});

afterAll(async () => {
  await stopDb();
});

describe('M-05 Regularization - Approval Flow', () => {
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
      shiftSnapshot: { name: 'Night Shift', startTime: '22:00', endTime: '06:00', gracePeriodMinutes: 15, isNightShift: true },
      locationSnapshot: { name: 'HQ', timezone: 'Asia/Kolkata' },
      policySnapshot: { minimumWorkingHours: 8, halfDayAfterHours: 4, overtimeStartsAfterHours: 8, lateAfterMinutes: 15 },
      attendanceEvents: [{
        eventId: targetEventId, eventType: 'CLOCK_IN', originalTime: new Date('2025-01-10T17:00:00.000Z'), correctedTime: null
      }],
      workflowStatus: 'REGULARIZATION_PENDING',
      attendanceStatus: 'LATE'
    });
    recordId = record._id;
  });

  afterEach(async () => {
    await clearDb();
  });

  it('1. Night shift regularization across midnight boundary', async () => {
    // 22:30 clock in -> regularizing to 22:00, and full day simulated out at 06:00
    const regReq = await AttendanceRegularizationRepository.createScoped({
      employeeId,
      attendanceRecordId: recordId,
      targetEventId,
      type: 'FULL_DAY',
      requestedClockIn: new Date('2025-01-10T16:30:00.000Z'), // 22:00 IST
      requestedClockOut: new Date('2025-01-11T00:30:00.000Z'), // 06:00 IST
      reason: 'Forgot to clock out',
      status: 'PENDING'
    }, orgId);

    const res = await request(app)
      .post(`/api/v1/attendance/regularizations/${regReq._id}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reviewerComments: 'Approved Night Shift' });
      
    expect(res.status).toBe(200);

    const record = await AttendanceRecordRepository.findByIdAndTenant(recordId, orgId);
    
    // Verify Night Shift Hours (22:00 to 06:00 = 8 hours)
    expect(record.workingHours).toBe(8);
    expect(record.overtimeHours).toBe(0);
    expect(record.attendanceStatus).toBe('PRESENT');
    
    // Validate events were correctly modified and synthetic one added
    expect(record.attendanceEvents.length).toBe(2);
    expect(record.attendanceEvents[1].eventType).toBe('CLOCK_OUT');
    expect(record.attendanceEvents[1].correctedTime.toISOString()).toBe('2025-01-11T00:30:00.000Z');

    // Validate audit logging
    const audits = await AuditRepository.model.find({ entityId: regReq._id, action: 'ATTENDANCE_REGULARIZATION_APPROVED' });
    expect(audits.length).toBe(1);
    expect(audits[0].newValue.workingHours).toBe(8);
    expect(audits[0].newValue.attendanceStatus).toBe('PRESENT');
  });
});
