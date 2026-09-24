import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../src/app.js';
import mongoose from 'mongoose';
import { startDb, clearDb, stopDb } from '../../setup/db.js';
import jwt from 'jsonwebtoken';
import env from '#@/config/env.js';
import RbacService from '#@/modules/roles/services/RbacService.js';
import cacheService from '#@/platform/cache/index.js';
import { vi } from 'vitest';
import Organization from '../../../src/modules/organization/models/Organization.js';
import Employee from '../../../src/modules/employees/models/Employee.js';
import AttendanceRecord from '../../../src/modules/attendance/models/AttendanceRecord.js';

describe('Attendance Reports & Analytics Integration', () => {
  let orgId, token, employeeId, employeeCode;

  beforeAll(async () => {
    await startDb();

    const org = await Organization.create({
      code: 'TESTORG',
      name: 'Test Org',
      domain: 'testorg.com'
    });
    orgId = org._id;

    // Create a mock HR manager
    const hrUser = new mongoose.Types.ObjectId();
    const sessionId = 'test-session';
    token = jwt.sign(
      { userId: hrUser, organizationId: orgId, sessionId },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
    await cacheService.set(`tenant:${orgId}:session:${hrUser}:${sessionId}`, JSON.stringify({ status: 'ACTIVE' }), 3600);
    
    vi.spyOn(RbacService, 'getEffectivePermissions').mockImplementation(async () => {
      return new Set(['attendance.read']);
    });

    const hrEmployee = await Employee.create({
      organizationId: orgId,
      userId: hrUser,
      firstName: 'HR',
      lastName: 'Manager',
      workEmail: 'hr@testorg.com',
      employeeCode: 'HR001',
      status: 'ACTIVE',
      joiningDate: new Date('2020-01-01'),
      shiftId: new mongoose.Types.ObjectId(),
      locationId: new mongoose.Types.ObjectId(),
      designationId: new mongoose.Types.ObjectId(),
      departmentId: new mongoose.Types.ObjectId()
    });

    const emp = await Employee.create({
      organizationId: orgId,
      firstName: 'John',
      lastName: 'Doe',
      workEmail: 'john@testorg.com',
      employeeCode: 'E001',
      status: 'ACTIVE',
      managerId: hrEmployee._id,
      joiningDate: new Date('2021-01-01'),
      shiftId: new mongoose.Types.ObjectId(),
      locationId: new mongoose.Types.ObjectId(),
      designationId: new mongoose.Types.ObjectId(),
      departmentId: new mongoose.Types.ObjectId()
    });
    employeeId = emp._id;
    employeeCode = emp.employeeCode;

    // Seed attendance records
    await AttendanceRecord.create([
      {
        organizationId: orgId,
        employeeId: emp._id,
        date: '2025-10-01',
        shiftId: new mongoose.Types.ObjectId(),
        locationId: new mongoose.Types.ObjectId(),
        attendanceStatus: 'PRESENT',
        workflowStatus: 'NORMAL',
        workingHours: 8,
        overtimeHours: 1
      },
      {
        organizationId: orgId,
        employeeId: emp._id,
        date: '2025-10-02',
        shiftId: new mongoose.Types.ObjectId(),
        locationId: new mongoose.Types.ObjectId(),
        attendanceStatus: 'LATE',
        workflowStatus: 'NORMAL',
        workingHours: 8,
        overtimeHours: 0
      },
      {
        organizationId: orgId,
        employeeId: emp._id,
        date: '2025-10-03',
        shiftId: new mongoose.Types.ObjectId(),
        locationId: new mongoose.Types.ObjectId(),
        attendanceStatus: 'ABSENT',
        workflowStatus: 'NORMAL'
      }
    ]);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await stopDb();
  });

  describe('GET /api/v1/attendance/reports', () => {
    it('should return paginated summary report', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/reports?type=summary&limit=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toHaveLength(2); // due to limit
      expect(res.body.data.total).toBe(3);
    });

    it('should filter by status correctly', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/reports?type=summary&status=ABSENT')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.data).toHaveLength(1);
      expect(res.body.data.data[0].attendanceStatus).toBe('ABSENT');
    });

    it('should aggregate top overtime correctly', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/reports?type=overtime')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].employeeCode).toBe('E001');
      expect(res.body.data[0].totalOvertime).toBe(1);
    });

    it('should aggregate top late arrivals correctly', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/reports?type=late')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].lateCount).toBe(1);
    });

    it('should aggregate analytics correctly', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/reports?type=analytics')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const metrics = res.body.data;
      expect(metrics.totalRecords).toBe(3);
      expect(metrics.presentCount).toBe(1);
      expect(metrics.absentCount).toBe(1);
      expect(metrics.lateCount).toBe(1);
      expect(metrics.totalOvertimeHours).toBe(1);
    });
  });

  describe('GET /api/v1/attendance/dashboard', () => {
    it('should return composed dashboard widgets', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const widgets = res.body.data;
      
      expect(widgets).toHaveProperty('overview');
      expect(widgets).toHaveProperty('today');
      expect(widgets).toHaveProperty('lateArrivals');
      expect(widgets).toHaveProperty('topOvertime');
      
      expect(widgets.overview.totalRecords).toBe(3);
    });
  });
});
