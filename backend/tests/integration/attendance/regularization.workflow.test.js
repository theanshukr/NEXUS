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
import EventBus from '#@/core/events/EventBus.js';
import { EVENTS } from '#@/core/constants/events/index.js';
import AuditRepository from '#@/modules/audit/repositories/AuditRepository.js';
import RbacService from '#@/modules/roles/services/RbacService.js';


  beforeAll(async () => {
    await startDb();
  });

  afterAll(async () => {
    await stopDb();
  });


describe('M-05 Attendance Regularization (ACID Transactions & Workflow)', () => {
  let orgId, managerId, employeeId;
  let employeeToken, managerToken;
  let employeeUser, managerUser;
  let recordId;
  const targetEventId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(EventBus, 'emit');
    // Setup Organization, Roles, Employees, and an AttendanceRecord
    orgId = new mongoose.Types.ObjectId();
    managerId = new mongoose.Types.ObjectId();
    employeeId = new mongoose.Types.ObjectId();

    await EmployeeRepository.model.insertMany([
      { 
        _id: managerId, organizationId: orgId, userId: new mongoose.Types.ObjectId(), 
        status: 'ACTIVE', roleIds: [], departmentId: new mongoose.Types.ObjectId(), 
        locationId: new mongoose.Types.ObjectId(), shiftId: new mongoose.Types.ObjectId(),
        designationId: new mongoose.Types.ObjectId(), firstName: 'Manager', lastName: 'User',
        employeeCode: 'EMP-001', joiningDate: new Date(), workEmail: 'manager@test.com'
      },
      { 
        _id: employeeId, organizationId: orgId, userId: new mongoose.Types.ObjectId(), 
        managerId: managerId, status: 'ACTIVE', roleIds: [], departmentId: new mongoose.Types.ObjectId(), 
        locationId: new mongoose.Types.ObjectId(), shiftId: new mongoose.Types.ObjectId(),
        designationId: new mongoose.Types.ObjectId(), firstName: 'Employee', lastName: 'User',
        employeeCode: 'EMP-002', joiningDate: new Date(), workEmail: 'employee@test.com'
      }
    ]);

    employeeUser = await EmployeeRepository.findByIdAndTenant(employeeId, orgId);
    managerUser = await EmployeeRepository.findByIdAndTenant(managerId, orgId);

    // Mock RBAC resolution dynamically based on userId
    vi.spyOn(RbacService, 'getEffectivePermissions').mockImplementation(async (uid) => {
      if (uid === employeeUser.userId.toString()) return new Set(['attendance.mark', 'attendance.regularization.request']);
      if (uid === managerUser.userId.toString()) return new Set(['attendance.read', 'attendance.regularization.approve']);
      return new Set();
    });

    // Tokens with permissions
    const employeeSessionId = 'fake-session-emp';
    const managerSessionId = 'fake-session-mgr';
    
    employeeToken = jwt.sign({ userId: employeeUser.userId, organizationId: orgId, sessionId: employeeSessionId, permissions: ['attendance.mark', 'attendance.regularization.request'] }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
    managerToken = jwt.sign({ userId: managerUser.userId, organizationId: orgId, sessionId: managerSessionId, permissions: ['attendance.read', 'attendance.regularization.approve'] }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

    await cacheService.set(`tenant:${orgId}:session:${employeeUser.userId}:${employeeSessionId}`, JSON.stringify({ email: 'employee@test.com', status: 'ACTIVE' }), 3600);
    await cacheService.set(`tenant:${orgId}:session:${managerUser.userId}:${managerSessionId}`, JSON.stringify({ email: 'manager@test.com', status: 'ACTIVE' }), 3600);

    // Mock policy & shift snapshots
    const policySnapshot = {
      lateAfterMinutes: 15,
      halfDayAfterHours: 4,
      minimumWorkingHours: 8,
      overtimeStartsAfterHours: 9,
      autoApproveGeofence: false
    };

    const shiftSnapshot = {
      name: 'Day',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriodMinutes: 15,
      isNightShift: false
    };

    // Create a base AttendanceRecord (employee forgot to clock out)
    const record = await AttendanceRecordRepository.model.create({
      organizationId: orgId,
      employeeId: employeeId,
      date: '2025-01-10',
      locationId: new mongoose.Types.ObjectId(),
      shiftId: new mongoose.Types.ObjectId(),
      shiftSnapshot,
      policySnapshot,
      locationSnapshot: { name: 'HQ', timezone: 'Asia/Kolkata' },
      geofenceSnapshot: { validationMethod: 'GPS', radiusMeters: 200 },
      attendanceEvents: [
        {
          eventId: targetEventId,
          eventType: 'CLOCK_IN',
          originalTime: new Date('2025-01-10T03:30:00Z'), // 09:00 IST
          correctedTime: null,
          coordinates: { lat: 0, lng: 0 },
          geofence: { status: 'VALID' }
        }
      ],
      attendanceStatus: 'PRESENT', // Optimistic
      workflowStatus: 'NORMAL',
      workingHours: 0,
      overtimeHours: 0
    });
    recordId = record._id;
  });

  afterEach(async () => {
    await AttendanceRecordRepository.model.deleteMany({});
    await AttendanceRegularizationRepository.model.deleteMany({});
    await EmployeeRepository.model.deleteMany({});
    await AuditRepository.model.deleteMany({});
  });

  it('1. Employee can request regularization and status changes to REGULARIZATION_PENDING', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/regularizations')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        attendanceRecordId: recordId.toString(),
        targetEventId: null, // Full day request
        type: 'FULL_DAY',
        requestedClockIn: new Date('2025-01-10T03:30:00Z').toISOString(),
        requestedClockOut: new Date('2025-01-10T12:30:00Z').toISOString(), // 18:00 IST
        reason: 'Forgot to clock out'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');

    const updatedRecord = await AttendanceRecordRepository.model.findById(recordId);
    expect(updatedRecord.workflowStatus).toBe('REGULARIZATION_PENDING');

    const audits = await AuditRepository.model.find({ action: 'ATTENDANCE_REGULARIZATION_REQUESTED' });
    expect(audits.length).toBe(1);

    // Event Bus Assertions
    const requestEmits = vi.mocked(EventBus.emit).mock.calls.filter(call => call[0] === EVENTS.ATTENDANCE.REGULARIZATION_REQUESTED);
    expect(requestEmits.length).toBe(1);
    const payload = requestEmits[0][1];
    expect(payload.regularizationId.toString()).toBe(res.body.data._id.toString());
    expect(payload.recordId.toString()).toBe(recordId.toString());
    expect(payload.employeeId.toString()).toBe(employeeId.toString());
    expect(payload.organizationId.toString()).toBe(orgId.toString());
  });

  it('2. Manager approval recalculates hours and finalizes state (ACID transaction)', async () => {
    // Insert a pending request manually
    const reg = await AttendanceRegularizationRepository.model.create({
      organizationId: orgId,
      attendanceRecordId: recordId,
      employeeId: employeeId,
      type: 'FULL_DAY',
      requestedClockIn: new Date('2025-01-10T03:30:00Z'),
      requestedClockOut: new Date('2025-01-10T12:30:00Z'),
      reason: 'Forgot to clock out',
      status: 'PENDING'
    });

    const res = await request(app)
      .post(`/api/v1/attendance/regularizations/${reg._id}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reviewerComments: 'Approved, please be careful next time.' });

    expect(res.status).toBe(200);

    const updatedRecord = await AttendanceRecordRepository.model.findById(recordId);
    expect(updatedRecord.workflowStatus).toBe('REGULARIZATION_APPROVED');
    // It should have calculated 9 working hours (09:00 to 18:00)
    expect(updatedRecord.workingHours).toBe(9); 
    // Contains correction details
    expect(updatedRecord.correctionDetails.correctedBy.toString()).toBe(managerUser.userId.toString());
    expect(updatedRecord.attendanceEvents.length).toBe(2); // Added synthetic clock-out
    
    const updatedReg = await AttendanceRegularizationRepository.model.findById(reg._id);
    expect(updatedReg.status).toBe('APPROVED');

    const audits = await AuditRepository.model.find({ action: 'ATTENDANCE_REGULARIZATION_APPROVED' });
    expect(audits.length).toBe(1);

    // Event Bus Assertions
    const approveEmits = vi.mocked(EventBus.emit).mock.calls.filter(call => call[0] === EVENTS.ATTENDANCE.REGULARIZATION_APPROVED);
    expect(approveEmits.length).toBe(1);
    const payload = approveEmits[0][1];
    expect(payload.regularizationId.toString()).toBe(reg._id.toString());
    expect(payload.recordId.toString()).toBe(recordId.toString());
    expect(payload.employeeId.toString()).toBe(employeeId.toString());
    expect(payload.organizationId.toString()).toBe(orgId.toString());
    expect(payload.timestamp).toBeDefined();
  });

  it('3. Manager rejection reverts workflowStatus to NORMAL if no other pending requests exist', async () => {
    // Insert a pending request manually and set record to PENDING
    const reg = await AttendanceRegularizationRepository.model.create({
      organizationId: orgId,
      attendanceRecordId: recordId,
      employeeId: employeeId,
      targetEventId: targetEventId,
      type: 'CLOCK_IN',
      requestedClockIn: new Date('2025-01-10T03:30:00Z'),
      reason: 'Wrong time',
      status: 'PENDING'
    });

    await AttendanceRecordRepository.model.updateOne({ _id: recordId }, { workflowStatus: 'REGULARIZATION_PENDING' });

    const res = await request(app)
      .post(`/api/v1/attendance/regularizations/${reg._id}/reject`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reviewerComments: 'Rejected.' });

    expect(res.status).toBe(200);

    const updatedRecord = await AttendanceRecordRepository.model.findById(recordId);
    expect(updatedRecord.workflowStatus).toBe('NORMAL');
    
    const updatedReg = await AttendanceRegularizationRepository.model.findById(reg._id);
    expect(updatedReg.status).toBe('REJECTED');
  });

});
