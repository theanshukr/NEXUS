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

describe('Attendance Export Integration', () => {
  let orgId, token;

  beforeAll(async () => {
    await startDb();

    const org = await Organization.create({
      code: 'TESTORG',
      name: 'Test Org',
      domain: 'testorg.com'
    });
    orgId = org._id;

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

    const emp = await Employee.create({
      organizationId: orgId,
      firstName: 'John',
      lastName: 'Doe',
      workEmail: 'john@testorg.com',
      employeeCode: 'E001',
      status: 'ACTIVE',
      joiningDate: new Date('2021-01-01'),
      shiftId: new mongoose.Types.ObjectId(),
      locationId: new mongoose.Types.ObjectId(),
      designationId: new mongoose.Types.ObjectId(),
      departmentId: new mongoose.Types.ObjectId()
    });

    await AttendanceRecord.create({
      organizationId: orgId,
      employeeId: emp._id,
      date: '2025-10-01',
      shiftId: new mongoose.Types.ObjectId(),
      locationId: new mongoose.Types.ObjectId(),
      attendanceStatus: 'PRESENT',
      workflowStatus: 'NORMAL',
      workingHours: 8,
      overtimeHours: 1
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await stopDb();
  });

  describe('GET /api/v1/attendance/export', () => {
    it('should stream CSV format correctly', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/export?format=csv')
        .set('Authorization', `Bearer ${token}`)
        .buffer()
        .parse((res, cb) => {
          res.setEncoding('utf8');
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => cb(null, data));
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment; filename="attendance_export_all_to_all.csv"');
      
      const csvContent = res.body;
      expect(csvContent).toContain('Date,Employee Code,Employee Name,Status');
      expect(csvContent).toContain('"2025-10-01","E001","John Doe","PRESENT"');
    });

    it('should stream Excel (XLSX) format correctly', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/export?format=xlsx')
        .set('Authorization', `Bearer ${token}`)
        .responseType('blob'); // Get raw buffer

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.headers['content-disposition']).toContain('attachment; filename="attendance_export_all_to_all.xlsx"');
      
      // We are just verifying the headers and binary response.
      // Validating Excel corruption usually requires parsing it back via exceljs,
      // but verifying stream output exists is sufficient for this integration test.
      expect(res.body.length).toBeGreaterThan(100);
    });
  });
});
