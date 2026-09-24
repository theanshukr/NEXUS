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

describe('M-05 Regularization - Authorization', () => {
  let orgIdA, orgIdB;
  let managerIdA, employeeIdA, employeeIdA2;
  let managerIdB, employeeIdB;
  let managerTokenA, managerTokenB, employeeTokenA, employeeTokenA2;
  let recordIdA;
  const targetEventId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(async () => {
    vi.clearAllMocks();
    orgIdA = new mongoose.Types.ObjectId();
    orgIdB = new mongoose.Types.ObjectId();
    
    managerIdA = new mongoose.Types.ObjectId();
    employeeIdA = new mongoose.Types.ObjectId();
    employeeIdA2 = new mongoose.Types.ObjectId();

    managerIdB = new mongoose.Types.ObjectId();
    employeeIdB = new mongoose.Types.ObjectId();

    const createEmp = (id, org, first, code, email, userId = new mongoose.Types.ObjectId()) => ({
      _id: id, organizationId: org, userId,
      status: 'ACTIVE', roleIds: [], departmentId: new mongoose.Types.ObjectId(),
      locationId: new mongoose.Types.ObjectId(), shiftId: new mongoose.Types.ObjectId(),
      designationId: new mongoose.Types.ObjectId(), firstName: first, lastName: 'User',
      employeeCode: code, joiningDate: new Date(), workEmail: email
    });

    const mUserA = createEmp(managerIdA, orgIdA, 'Manager A', 'M-A', 'ma@test.com');
    const eUserA = createEmp(employeeIdA, orgIdA, 'Employee A', 'E-A', 'ea@test.com');
    const eUserA2 = createEmp(employeeIdA2, orgIdA, 'Employee A2', 'E-A2', 'ea2@test.com');
    const mUserB = createEmp(managerIdB, orgIdB, 'Manager B', 'M-B', 'mb@test.com');
    const eUserB = createEmp(employeeIdB, orgIdB, 'Employee B', 'E-B', 'eb@test.com');

    await EmployeeRepository.model.insertMany([mUserA, eUserA, eUserA2, mUserB, eUserB]);

    vi.spyOn(RbacService, 'getEffectivePermissions').mockImplementation(async (uid) => {
      const uidStr = uid.toString();
      if (uidStr === mUserA.userId.toString() || uidStr === mUserB.userId.toString()) {
        return new Set(['attendance.read', 'attendance.regularization.approve']);
      }
      return new Set(['attendance.mark', 'attendance.regularization.request']);
    });

    const signToken = async (user, org) => {
      const sess = `sess-${user.userId}`;
      const token = jwt.sign({ userId: user.userId, organizationId: org, sessionId: sess }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
      await cacheService.set(`tenant:${org}:session:${user.userId}:${sess}`, JSON.stringify({ email: user.workEmail, status: 'ACTIVE' }), 3600);
      return token;
    };

    managerTokenA = await signToken(mUserA, orgIdA);
    managerTokenB = await signToken(mUserB, orgIdB);
    employeeTokenA = await signToken(eUserA, orgIdA);
    employeeTokenA2 = await signToken(eUserA2, orgIdA);

    const record = await AttendanceRecordRepository.model.create({
      organizationId: orgIdA,
      employeeId: employeeIdA,
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
    });
    recordIdA = record._id;
  });

  afterEach(async () => {
    await clearDb();
  });

  it('1. Tenant Isolation: Manager B cannot approve Employee A regularization', async () => {
    const regReq = await AttendanceRegularizationRepository.createScoped({
      employeeId: employeeIdA,
      attendanceRecordId: recordIdA,
      targetEventId,
      type: 'CLOCK_IN',
      requestedClockIn: new Date('2025-01-10T09:00:00.000Z'),
      reason: 'Issue',
      status: 'PENDING'
    }, orgIdA);

    const res = await request(app)
      .post(`/api/v1/attendance/regularizations/${regReq._id}/approve`)
      .set('Authorization', `Bearer ${managerTokenB}`)
      .send({ reviewerComments: 'Approve M-B' });

    expect(res.status).toBe(404); // Record not found for Org B tenant

    const unchanged = await AttendanceRegularizationRepository.findByIdAndTenant(regReq._id, orgIdA);
    expect(unchanged.status).toBe('PENDING');
  });

  it('2. Cross-Employee Request: Employee A2 cannot request for Employee A', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/regularizations')
      .set('Authorization', `Bearer ${employeeTokenA2}`)
      .send({
        attendanceRecordId: recordIdA.toString(),
        targetEventId,
        type: 'CLOCK_IN',
        requestedClockIn: '2025-01-10T09:00:00.000Z',
        reason: 'Helping my friend'
      });

    // We expect 403 Forbidden because a user can only request for themselves
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/You can only request regularization for your own attendance/);
  });
});
