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

describe('M-05 Regularization - Concurrency', () => {
  let orgId, managerId1, managerId2, employeeId;
  let managerToken1, managerToken2;
  let employeeUser, managerUser1, managerUser2;
  let recordId;
  const targetEventId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(async () => {
    vi.clearAllMocks();
    orgId = new mongoose.Types.ObjectId();
    managerId1 = new mongoose.Types.ObjectId();
    managerId2 = new mongoose.Types.ObjectId();
    employeeId = new mongoose.Types.ObjectId();

    await EmployeeRepository.model.insertMany([
      { 
        _id: managerId1, organizationId: orgId, userId: new mongoose.Types.ObjectId(), 
        status: 'ACTIVE', roleIds: [], departmentId: new mongoose.Types.ObjectId(), 
        locationId: new mongoose.Types.ObjectId(), shiftId: new mongoose.Types.ObjectId(),
        designationId: new mongoose.Types.ObjectId(), firstName: 'Manager 1', lastName: 'User',
        employeeCode: 'EMP-001', joiningDate: new Date(), workEmail: 'mgr1@test.com'
      },
      { 
        _id: managerId2, organizationId: orgId, userId: new mongoose.Types.ObjectId(), 
        status: 'ACTIVE', roleIds: [], departmentId: new mongoose.Types.ObjectId(), 
        locationId: new mongoose.Types.ObjectId(), shiftId: new mongoose.Types.ObjectId(),
        designationId: new mongoose.Types.ObjectId(), firstName: 'Manager 2', lastName: 'User',
        employeeCode: 'EMP-002', joiningDate: new Date(), workEmail: 'mgr2@test.com'
      },
      { 
        _id: employeeId, organizationId: orgId, userId: new mongoose.Types.ObjectId(), 
        managerId: managerId1, status: 'ACTIVE', roleIds: [], departmentId: new mongoose.Types.ObjectId(), 
        locationId: new mongoose.Types.ObjectId(), shiftId: new mongoose.Types.ObjectId(),
        designationId: new mongoose.Types.ObjectId(), firstName: 'Employee', lastName: 'User',
        employeeCode: 'EMP-003', joiningDate: new Date(), workEmail: 'emp@test.com'
      }
    ]);

    employeeUser = await EmployeeRepository.findByIdAndTenant(employeeId, orgId);
    managerUser1 = await EmployeeRepository.findByIdAndTenant(managerId1, orgId);
    managerUser2 = await EmployeeRepository.findByIdAndTenant(managerId2, orgId);

    vi.spyOn(RbacService, 'getEffectivePermissions').mockImplementation(async (uid) => {
      if (uid === employeeUser.userId.toString()) return new Set(['attendance.mark', 'attendance.regularization.request']);
      if (uid === managerUser1.userId.toString()) return new Set(['attendance.read', 'attendance.regularization.approve']);
      if (uid === managerUser2.userId.toString()) return new Set(['attendance.read', 'attendance.regularization.approve']);
      return new Set();
    });

    const m1SessionId = 'sess-m1';
    const m2SessionId = 'sess-m2';
    
    managerToken1 = jwt.sign({ userId: managerUser1.userId, organizationId: orgId, sessionId: m1SessionId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
    managerToken2 = jwt.sign({ userId: managerUser2.userId, organizationId: orgId, sessionId: m2SessionId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

    await cacheService.set(`tenant:${orgId}:session:${managerUser1.userId}:${m1SessionId}`, JSON.stringify({ email: 'mgr1@test.com', status: 'ACTIVE' }), 3600);
    await cacheService.set(`tenant:${orgId}:session:${managerUser2.userId}:${m2SessionId}`, JSON.stringify({ email: 'mgr2@test.com', status: 'ACTIVE' }), 3600);

    const shiftSnapshot = {
      name: 'General Shift',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriodMinutes: 15,
      isNightShift: false
    };
    
    const policySnapshot = {
      minimumWorkingHours: 8,
      halfDayAfterHours: 4,
      overtimeStartsAfterHours: 9,
      lateAfterMinutes: 15,
      autoApproveGeofence: false
    };

    const record = await AttendanceRecordRepository.model.create({
      organizationId: orgId,
      employeeId: employeeId,
      date: '2025-01-10',
      locationId: new mongoose.Types.ObjectId(),
      shiftId: new mongoose.Types.ObjectId(),
      shiftSnapshot,
      policySnapshot,
      locationSnapshot: { name: 'HQ', timezone: 'Asia/Kolkata' },
      geofenceSnapshot: { status: 'VALID', radius: 100 },
      attendanceEvents: [
        {
          eventId: targetEventId,
          eventType: 'CLOCK_IN',
          originalTime: new Date('2025-01-10T10:30:00.000Z'), // Late
          correctedTime: new Date('2025-01-10T10:30:00.000Z'),
          coordinates: { lat: 0, lng: 0 },
          geofence: { status: 'VALID', distanceFromOfficeMeters: 0, gpsAccuracyMeters: 0 },
          device: { platform: 'WEB' }
        }
      ],
      attendanceStatus: 'LATE',
      workflowStatus: 'REGULARIZATION_PENDING',
      workingHours: 0,
      overtimeHours: 0
    });
    recordId = record._id;
  });

  afterEach(async () => {
    await clearDb();
  });

  it('1. Approve vs Approve: Two managers approving simultaneously should only succeed once', async () => {
    const regReq = await AttendanceRegularizationRepository.createScoped({
      employeeId,
      attendanceRecordId: recordId,
      targetEventId,
      type: 'CLOCK_IN',
      requestedClockIn: new Date('2025-01-10T09:00:00.000Z'),
      reason: 'Network issue at 9 AM',
      status: 'PENDING'
    }, orgId);

    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/v1/attendance/regularizations/${regReq._id}/approve`)
        .set('Authorization', `Bearer ${managerToken1}`)
        .send({ reviewerComments: 'Approve M1' }),
      request(app)
        .post(`/api/v1/attendance/regularizations/${regReq._id}/approve`)
        .set('Authorization', `Bearer ${managerToken2}`)
        .send({ reviewerComments: 'Approve M2' })
    ]);

    const statuses = [res1.status, res2.status].sort();
    
    expect(statuses[0]).toBe(200); // Exactly one 200
    expect(statuses[1]).toBe(409); // Exactly one 409

    const finalRecord = await AttendanceRecordRepository.findByIdAndTenant(recordId, orgId);
    expect(finalRecord.attendanceEvents.length).toBe(1);
    expect(finalRecord.attendanceEvents[0].correctedTime.toISOString()).toBe(new Date('2025-01-10T09:00:00.000Z').toISOString());
    expect(finalRecord.workflowStatus).toBe('REGULARIZATION_APPROVED');
    
    const audits = await AuditRepository.model.find({ entityId: regReq._id, action: 'ATTENDANCE_REGULARIZATION_APPROVED' });
    expect(audits.length).toBe(1); // exactly one audit

    const finalReq = await AttendanceRegularizationRepository.findByIdAndTenant(regReq._id, orgId);
    expect(finalReq.status).toBe('APPROVED'); // exactly one approved regularization
  });

  it('2. Approve vs Reject: Simultaneous approve and reject should only succeed once', async () => {
    const regReq = await AttendanceRegularizationRepository.createScoped({
      employeeId,
      attendanceRecordId: recordId,
      targetEventId,
      type: 'CLOCK_IN',
      requestedClockIn: new Date('2025-01-10T09:00:00.000Z'),
      reason: 'Network issue at 9 AM',
      status: 'PENDING'
    }, orgId);

    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/v1/attendance/regularizations/${regReq._id}/approve`)
        .set('Authorization', `Bearer ${managerToken1}`)
        .send({ reviewerComments: 'Approve M1' }),
      request(app)
        .post(`/api/v1/attendance/regularizations/${regReq._id}/reject`)
        .set('Authorization', `Bearer ${managerToken2}`)
        .send({ reviewerComments: 'Reject M2' })
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses[0]).toBe(200);
    expect(statuses[1]).toBe(409);
    
    const finalReq = await AttendanceRegularizationRepository.findByIdAndTenant(regReq._id, orgId);
    
    // Whichever succeeded determines the final state
    if (res1.status === 200) {
      expect(finalReq.status).toBe('APPROVED');
      const audits = await AuditRepository.model.find({ entityId: regReq._id, action: 'ATTENDANCE_REGULARIZATION_APPROVED' });
      expect(audits.length).toBe(1);
    } else {
      expect(finalReq.status).toBe('REJECTED');
      const audits = await AuditRepository.model.find({ entityId: regReq._id, action: 'ATTENDANCE_REGULARIZATION_REJECTED' });
      expect(audits.length).toBe(1);
    }
    
    const finalRecord = await AttendanceRecordRepository.findByIdAndTenant(recordId, orgId);
    if (finalReq.status === 'APPROVED') {
      expect(finalRecord.workflowStatus).toBe('REGULARIZATION_APPROVED');
      expect(finalRecord.attendanceEvents[0].correctedTime.toISOString()).toBe(new Date('2025-01-10T09:00:00.000Z').toISOString());
    } else {
      // Workflow status reverts to NORMAL if no other pending requests
      expect(finalRecord.workflowStatus).toBe('NORMAL');
      expect(finalRecord.attendanceEvents[0].correctedTime.toISOString()).toBe(new Date('2025-01-10T10:30:00.000Z').toISOString());
    }
  });
});
