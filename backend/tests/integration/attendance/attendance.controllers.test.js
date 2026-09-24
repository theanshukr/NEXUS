import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../src/app.js';
import mongoose from 'mongoose';
import { startDb, clearDb, stopDb } from '../../setup/db.js';
import jwt from 'jsonwebtoken';
import env from '#@/config/env.js';
import Organization from '../../../src/modules/organization/models/Organization.js';
import Employee from '../../../src/modules/employees/models/Employee.js';
import Location from '../../../src/modules/organization/models/Location.js';
import { Shift } from '../../../src/modules/organization/models/Shift.js';
import RbacService from '#@/modules/roles/services/RbacService.js';
import cacheService from '#@/platform/cache/index.js';
import { vi } from 'vitest';
import PERMISSIONS from '#@/core/constants/permissions/index.js';
import AttendanceRecordRepository from '../../../src/modules/attendance/repositories/AttendanceRecordRepository.js';

describe('Attendance Controllers HTTP Integration', () => {
  let orgId, token, employeeId, locationId, shiftId, policyId;

  beforeAll(async () => {
    await startDb();

    const org = await Organization.create({
      code: 'CTRLORG',
      name: 'Controller Test Org',
      domain: 'ctrlorg.com'
    });
    orgId = org._id;

    const location = await Location.create({
      organizationId: orgId,
      name: 'HQ Office',
      code: 'HQ01',
      timezone: 'UTC',
      address: '123 Test St, Test City, TS 12345, Test Country',
      coordinates: { latitude: 28.0, longitude: 77.0 },
      geofenceRadiusMeters: 200,
      isActive: true,
      status: 'ACTIVE'
    });
    locationId = location._id;

    const shift = await Shift.create({
      organizationId: orgId,
      name: 'General Shift',
      code: 'SH-GEN',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriodMinutes: 15,
      isNightShift: false,
      status: 'ACTIVE',
      workDays: [0, 1, 2, 3, 4, 5, 6]
    });
    shiftId = shift._id;

    const userId = new mongoose.Types.ObjectId();
    const sessionId = 'test-session';
    token = jwt.sign(
      { userId, organizationId: orgId, sessionId },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    await cacheService.set(`tenant:${orgId}:session:${userId}:${sessionId}`, JSON.stringify({ status: 'ACTIVE' }), 3600);

    vi.spyOn(RbacService, 'getEffectivePermissions').mockResolvedValue(new Set([
      PERMISSIONS.ATTENDANCE.POLICY_CREATE,
      PERMISSIONS.ATTENDANCE.POLICY_READ,
      PERMISSIONS.ATTENDANCE.POLICY_UPDATE,
      PERMISSIONS.ATTENDANCE.MARK,
      PERMISSIONS.ATTENDANCE.REGULARIZATION_REQUEST,
      PERMISSIONS.ATTENDANCE.READ,
      PERMISSIONS.ATTENDANCE.REGULARIZATION_APPROVE
    ]));

    const emp = await Employee.create({
      organizationId: orgId,
      userId,
      employeeCode: 'EMP-001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@ctrlorg.com',
      locationId,
      shiftId,
      departmentId: new mongoose.Types.ObjectId(),
      designationId: new mongoose.Types.ObjectId(),
      joiningDate: new Date('2025-01-01'),
      status: 'ACTIVE'
    });
    employeeId = emp._id;
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await clearDb();
    await stopDb();
  });

  describe('AttendancePolicyController (/api/v1/attendance-policies)', () => {
    it('creates a new attendance policy via POST /api/v1/attendance-policies', async () => {
      const res = await request(app)
        .post('/api/v1/attendance-policies')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'HQ Standard Shift',
          isDefault: true,
          lateAfterMinutes: 15,
          halfDayAfterHours: 4,
          minimumWorkingHours: 8
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('HQ Standard Shift');
      policyId = res.body.data._id;
    });

    it('retrieves all attendance policies via GET /api/v1/attendance-policies', async () => {
      const res = await request(app)
        .get('/api/v1/attendance-policies')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.data)).toBe(true);
      expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);
    });

    it('retrieves a single policy by ID via GET /api/v1/attendance-policies/:id', async () => {
      const res = await request(app)
        .get(`/api/v1/attendance-policies/${policyId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(policyId);
    });

    it('updates a policy via PATCH /api/v1/attendance-policies/:id', async () => {
      const res = await request(app)
        .patch(`/api/v1/attendance-policies/${policyId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          lateAfterMinutes: 20
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lateAfterMinutes).toBe(20);
    });
  });

  describe('AttendanceController Operational Endpoints (/api/v1/attendance)', () => {
    it('records clock in via POST /api/v1/attendance/clock-in', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/clock-in')
        .set('Authorization', `Bearer ${token}`)
        .send({
          gpsData: { lat: 28.0, lng: 77.0, gpsAccuracyMeters: 10 },
          deviceData: { deviceId: 'dev-001', platform: 'Android' }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe(employeeId.toString());
    });

    it('retrieves today attendance record via GET /api/v1/attendance/today', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/today')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).not.toBeNull();
      expect(res.body.data.employeeId).toBe(employeeId.toString());
    });

    it('retrieves attendance history via GET /api/v1/attendance/me', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const list = Array.isArray(res.body.data) ? res.body.data : (res.body.data.data || res.body.data.records);
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThanOrEqual(1);
    });

    it('records clock out via POST /api/v1/attendance/clock-out', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/clock-out')
        .set('Authorization', `Bearer ${token}`)
        .send({
          gpsData: { lat: 28.0, lng: 77.0, gpsAccuracyMeters: 10 },
          deviceData: { deviceId: 'dev-001', platform: 'Android' }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.workingHours).toBeDefined();
    });

    it('returns 404 when employee profile not found for getToday or getMyAttendance', async () => {
      const randomUserId = new mongoose.Types.ObjectId();
      const randomSessionId = 'random-session';
      const randomToken = jwt.sign(
        { userId: randomUserId, organizationId: orgId, sessionId: randomSessionId },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );
      await cacheService.set(`tenant:${orgId}:session:${randomUserId}:${randomSessionId}`, JSON.stringify({ status: 'ACTIVE' }), 3600);

      const resToday = await request(app)
        .get('/api/v1/attendance/today')
        .set('Authorization', `Bearer ${randomToken}`);
      expect(resToday.status).toBe(404);

      const resHistory = await request(app)
        .get('/api/v1/attendance/me')
        .set('Authorization', `Bearer ${randomToken}`);
      expect(resHistory.status).toBe(404);
    });
  });

  describe('RegularizationController Integration', () => {
    let rec1Id, rec2Id, reg1Id, reg2Id;
    const event1Id = '11111111-e89b-12d3-a456-426614174000';
    const event2Id = '22222222-e89b-12d3-a456-426614174000';

    beforeAll(async () => {
      const rec1 = await AttendanceRecordRepository.model.create({
        organizationId: orgId,
        employeeId,
        date: '2025-01-10',
        locationId,
        shiftId,
        shiftSnapshot: { name: 'General Shift', startTime: '09:00', endTime: '18:00', gracePeriodMinutes: 15, isNightShift: false },
        locationSnapshot: { name: 'HQ Office', timezone: 'UTC' },
        policySnapshot: { minimumWorkingHours: 8, halfDayAfterHours: 4, overtimeStartsAfterHours: 9, lateAfterMinutes: 15 },
        attendanceEvents: [{
          eventId: event1Id, eventType: 'CLOCK_IN', originalTime: new Date('2025-01-10T10:30:00.000Z'), correctedTime: null
        }],
        workflowStatus: 'NORMAL',
        attendanceStatus: 'LATE'
      });
      rec1Id = rec1._id;

      const rec2 = await AttendanceRecordRepository.model.create({
        organizationId: orgId,
        employeeId,
        date: '2025-01-11',
        locationId,
        shiftId,
        shiftSnapshot: { name: 'General Shift', startTime: '09:00', endTime: '18:00', gracePeriodMinutes: 15, isNightShift: false },
        locationSnapshot: { name: 'HQ Office', timezone: 'UTC' },
        policySnapshot: { minimumWorkingHours: 8, halfDayAfterHours: 4, overtimeStartsAfterHours: 9, lateAfterMinutes: 15 },
        attendanceEvents: [{
          eventId: event2Id, eventType: 'CLOCK_IN', originalTime: new Date('2025-01-11T10:30:00.000Z'), correctedTime: null
        }],
        workflowStatus: 'NORMAL',
        attendanceStatus: 'LATE'
      });
      rec2Id = rec2._id;
    });

    it('submits regularization requests via POST /api/v1/attendance/regularizations', async () => {
      const res1 = await request(app)
        .post('/api/v1/attendance/regularizations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          attendanceRecordId: rec1Id.toString(),
          targetEventId: event1Id,
          type: 'CLOCK_IN',
          requestedClockIn: '2025-01-10T09:00:00.000Z',
          reason: 'Network issue during clock-in 1'
        });
      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);
      reg1Id = res1.body.data._id;

      const res2 = await request(app)
        .post('/api/v1/attendance/regularizations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          attendanceRecordId: rec2Id.toString(),
          targetEventId: event2Id,
          type: 'CLOCK_IN',
          requestedClockIn: '2025-01-11T09:00:00.000Z',
          reason: 'Network issue during clock-in 2'
        });
      expect(res2.status).toBe(201);
      expect(res2.body.success).toBe(true);
      reg2Id = res2.body.data._id;
    });

    it('lists regularization requests via GET /api/v1/attendance/regularizations', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/regularizations?status=PENDING')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('approves a regularization request via POST /api/v1/attendance/regularizations/:id/approve', async () => {
      const res = await request(app)
        .post(`/api/v1/attendance/regularizations/${reg1Id}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reviewerComments: 'Approved by controller test' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects a regularization request via POST /api/v1/attendance/regularizations/:id/reject', async () => {
      const res = await request(app)
        .post(`/api/v1/attendance/regularizations/${reg2Id}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reviewerComments: 'Rejected by controller test' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
