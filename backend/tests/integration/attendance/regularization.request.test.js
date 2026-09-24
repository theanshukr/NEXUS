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

describe('M-05 Regularization - Request Flow', () => {
  let orgId, managerId, employeeId;
  let employeeToken;
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
      return new Set(['attendance.mark', 'attendance.regularization.request']);
    });

    const eSessionId = 'sess-e1';
    employeeToken = jwt.sign({ userId: employeeUser.userId, organizationId: orgId, sessionId: eSessionId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
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

  it('1. Fails with 400 on missing or invalid fields', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/regularizations')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        // Missing attendanceRecordId, invalid type
        type: 'INVALID_TYPE',
        reason: 'shrt' // Too short
      });
    
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ERR_VALIDATION');
  });

  it('2. Prevents duplicate active requests for the exact same event', async () => {
    // First request succeeds
    await request(app)
      .post('/api/v1/attendance/regularizations')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        attendanceRecordId: recordId.toString(),
        targetEventId,
        type: 'CLOCK_IN',
        requestedClockIn: '2025-01-10T09:00:00.000Z',
        reason: 'Network issue at 9 AM'
      });

    // Second request for the same event should fail with 409
    const res2 = await request(app)
      .post('/api/v1/attendance/regularizations')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        attendanceRecordId: recordId.toString(),
        targetEventId,
        type: 'CLOCK_IN',
        requestedClockIn: '2025-01-10T09:15:00.000Z',
        reason: 'Actually it was 9:15'
      });
      
    expect(res2.status).toBe(409);
    expect(res2.body.error.message).toMatch(/A pending regularization request already exists for this event/);
  });

  it('3. Fails if record is already locked/finalized', async () => {
    await AttendanceRecordRepository.model.updateOne({ _id: recordId }, { $set: { workflowStatus: 'REGULARIZATION_APPROVED' } });
    
    const res = await request(app)
      .post('/api/v1/attendance/regularizations')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        attendanceRecordId: recordId.toString(),
        targetEventId,
        type: 'CLOCK_IN',
        requestedClockIn: '2025-01-10T09:00:00.000Z',
        reason: 'Network issue at 9 AM'
      });
      
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/Record is already finalized/);
  });

  it('4. Fails if targetEventId is missing for non-FULL_DAY requests', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/regularizations')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        attendanceRecordId: recordId,
        type: 'CLOCK_IN',
        requestedClockIn: new Date('2025-01-10T09:00:00.000Z'),
        reason: 'Issue'
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/targetEventId is required unless requesting FULL_DAY regularization/i);
  });
});
