import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import AttendanceClockService from '#@/modules/attendance/services/AttendanceClockService.js';
import AttendanceRecordRepository from '#@/modules/attendance/repositories/AttendanceRecordRepository.js';
import EmployeeRepository from '#@/modules/employees/repositories/EmployeeRepository.js';
import ShiftRepository from '#@/modules/organization/repositories/ShiftRepository.js';
import LocationRepository from '#@/modules/organization/repositories/LocationRepository.js';
import HolidayCalendarRepository from '#@/modules/organization/repositories/HolidayCalendarRepository.js';
import AttendancePolicyService from '#@/modules/attendance/services/AttendancePolicyService.js';
import EventBus from '#@/core/events/EventBus.js';
import EVENTS from '#@/core/constants/events/index.js';
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '#@/core/errors/AppError.js';
import { startDb, stopDb } from '../../setup/db.js';

beforeAll(async () => {
  await startDb();
});

afterAll(async () => {
  await stopDb();
});

describe('AttendanceClockService (100% Coverage & Strict Event Verification)', () => {
  let orgId, userId, employeeId, shiftId, locationId, policyId;
  let gpsData, deviceData;

  beforeEach(async () => {
    vi.clearAllMocks();
    orgId = new mongoose.Types.ObjectId();
    userId = new mongoose.Types.ObjectId();
    employeeId = new mongoose.Types.ObjectId();
    shiftId = new mongoose.Types.ObjectId();
    locationId = new mongoose.Types.ObjectId();
    policyId = new mongoose.Types.ObjectId();

    gpsData = { lat: 28.6139, lng: 77.2090, gpsAccuracyMeters: 10 };
    deviceData = { browser: 'Chrome', userAgent: 'Mozilla/5.0', ip: '127.0.0.1', platform: 'Win32', deviceId: 'dev-123' };

    await LocationRepository.model.create({
      _id: locationId,
      organizationId: orgId,
      name: 'Delhi HQ',
      code: 'LOC-DEL',
      timezone: 'Asia/Kolkata',
      address: '123 Connaught Place',
      status: 'ACTIVE',
      coordinates: { latitude: 28.6139, longitude: 77.2090 },
      geofenceRadiusMeters: 200
    });

    await ShiftRepository.model.create({
      _id: shiftId,
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

    await EmployeeRepository.model.create({
      _id: employeeId,
      organizationId: orgId,
      userId: userId,
      firstName: 'John',
      lastName: 'Doe',
      employeeCode: 'EMP-100',
      workEmail: 'john@test.com',
      joiningDate: new Date(),
      status: 'ACTIVE',
      shiftId: shiftId,
      locationId: locationId,
      departmentId: new mongoose.Types.ObjectId(),
      designationId: new mongoose.Types.ObjectId(),
      roleIds: []
    });

    await AttendancePolicyService.createPolicy({
      name: 'Default Policy',
      isDefault: true,
      lateAfterMinutes: 15,
      halfDayAfterHours: 4,
      minimumWorkingHours: 8,
      overtimeStartsAfterHours: 9,
      autoApproveGeofence: false
    }, { userId }, orgId);
  });

  describe('clockIn', () => {
    it('clocks in successfully inside geofence and asserts exact event bus emission', async () => {
      const emitSpy = vi.spyOn(EventBus, 'emit');

      const record = await AttendanceClockService.clockIn({
        userId,
        gpsData,
        deviceData,
        organizationId: orgId
      });

      expect(record).toBeDefined();
      expect(record.employeeId.toString()).toBe(employeeId.toString());
      expect(record.attendanceEvents.length).toBe(1);
      expect(record.attendanceEvents[0].eventType).toBe('CLOCK_IN');

      // Strict Event Assertions
      const clockInEmissions = emitSpy.mock.calls.filter(call => call[0] === EVENTS.ATTENDANCE.CLOCKED_IN);
      expect(clockInEmissions).toHaveLength(1);

      const [eventName, payload] = clockInEmissions[0];
      expect(eventName).toBe(EVENTS.ATTENDANCE.CLOCKED_IN);
      expect(payload).toEqual({
        recordId: record._id,
        employeeId: employeeId,
        organizationId: orgId,
        timestamp: expect.any(String),
        status: expect.any(String)
      });
    });

    it('throws NotFoundError if employee profile does not exist', async () => {
      await expect(
        AttendanceClockService.clockIn({ userId: new mongoose.Types.ObjectId(), gpsData, deviceData, organizationId: orgId })
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError if employee status is not ACTIVE', async () => {
      await EmployeeRepository.updateByIdAndTenant(employeeId, { status: 'SUSPENDED' }, orgId);
      await expect(
        AttendanceClockService.clockIn({ userId, gpsData, deviceData, organizationId: orgId })
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws ValidationError if employee has no shiftId assigned', async () => {
      await EmployeeRepository.model.updateOne({ _id: employeeId }, { $unset: { shiftId: 1 } });
      await expect(
        AttendanceClockService.clockIn({ userId, gpsData, deviceData, organizationId: orgId })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError if employee has no locationId assigned', async () => {
      await EmployeeRepository.model.updateOne({ _id: employeeId }, { $unset: { locationId: 1 } });
      await expect(
        AttendanceClockService.clockIn({ userId, gpsData, deviceData, organizationId: orgId })
      ).rejects.toThrow(ValidationError);
    });

    it('throws NotFoundError if assigned shift no longer exists', async () => {
      await ShiftRepository.deleteByIdAndTenant(shiftId, orgId);
      await expect(
        AttendanceClockService.clockIn({ userId, gpsData, deviceData, organizationId: orgId })
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ValidationError if assigned shift is archived', async () => {
      await ShiftRepository.updateByIdAndTenant(shiftId, { status: 'ARCHIVED' }, orgId);
      await expect(
        AttendanceClockService.clockIn({ userId, gpsData, deviceData, organizationId: orgId })
      ).rejects.toThrow(ValidationError);
    });

    it('throws NotFoundError if assigned location no longer exists', async () => {
      await LocationRepository.deleteByIdAndTenant(locationId, orgId);
      await expect(
        AttendanceClockService.clockIn({ userId, gpsData, deviceData, organizationId: orgId })
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ValidationError if assigned location is archived', async () => {
      await LocationRepository.updateByIdAndTenant(locationId, { status: 'ARCHIVED' }, orgId);
      await expect(
        AttendanceClockService.clockIn({ userId, gpsData, deviceData, organizationId: orgId })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ConflictError if employee has already clocked in today', async () => {
      await AttendanceClockService.clockIn({ userId, gpsData, deviceData, organizationId: orgId });
      await expect(
        AttendanceClockService.clockIn({ userId, gpsData, deviceData, organizationId: orgId })
      ).rejects.toThrow(ConflictError);
    });

    it('throws ValidationError if today is a mandatory holiday', async () => {
      const now = new Date();
      const year = now.getFullYear();
      const dateStr = now.toISOString().split('T')[0];

      await HolidayCalendarRepository.model.create({
        organizationId: orgId,
        locationId: locationId,
        year: year,
        holidays: [{ name: 'Independence Day', date: new Date(dateStr), type: 'MANDATORY' }]
      });

      await expect(
        AttendanceClockService.clockIn({ userId, gpsData, deviceData, organizationId: orgId })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError if geofence validation fails and autoApproveGeofence is false', async () => {
      const farGps = { lat: 30.0, lng: 78.0, gpsAccuracyMeters: 10 };
      await expect(
        AttendanceClockService.clockIn({ userId, gpsData: farGps, deviceData, organizationId: orgId })
      ).rejects.toThrow(ValidationError);
    });

    it('allows clock-in outside geofence when autoApproveGeofence is true', async () => {
      const policy = await AttendancePolicyService.getPolicies({}, orgId);
      await AttendancePolicyService.updatePolicy(policy.data[0]._id, { autoApproveGeofence: true }, { userId }, orgId);

      const farGps = { lat: 30.0, lng: 78.0, gpsAccuracyMeters: 10 };
      const record = await AttendanceClockService.clockIn({ userId, gpsData: farGps, deviceData, organizationId: orgId });
      expect(record).toBeDefined();
      expect(record.attendanceEvents[0].geofence.status).not.toBe('VALID');
    });

    it('converts MongoDB duplicate key E11000 error into a ConflictError during concurrent clock-ins', async () => {
      vi.spyOn(AttendanceRecordRepository, 'createScoped').mockRejectedValueOnce({ code: 11000 });
      await expect(
        AttendanceClockService.clockIn({ userId, gpsData, deviceData, organizationId: orgId })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('clockOut', () => {
    it('clocks out successfully and asserts exact event bus emissions', async () => {
      await AttendanceClockService.clockIn({ userId, gpsData, deviceData, organizationId: orgId });
      const emitSpy = vi.spyOn(EventBus, 'emit');

      const record = await AttendanceClockService.clockOut({
        userId,
        gpsData,
        deviceData,
        organizationId: orgId
      });

      expect(record.attendanceEvents.length).toBe(2);
      expect(record.attendanceEvents[1].eventType).toBe('CLOCK_OUT');

      // Assert CLOCKED_OUT event emission
      const clockOutEmissions = emitSpy.mock.calls.filter(call => call[0] === EVENTS.ATTENDANCE.CLOCKED_OUT);
      expect(clockOutEmissions).toHaveLength(1);

      const [eventName, payload] = clockOutEmissions[0];
      expect(eventName).toBe(EVENTS.ATTENDANCE.CLOCKED_OUT);
      expect(payload).toEqual({
        recordId: record._id,
        employeeId: employeeId,
        organizationId: orgId,
        timestamp: expect.any(String),
        workingHours: expect.any(Number)
      });
    });

    it('emits STATUS_CHANGED event when clock-out recalculates attendance status to a different status', async () => {
      const recordIn = await AttendanceClockService.clockIn({ userId, gpsData, deviceData, organizationId: orgId });
      
      // Manually modify previousStatus in DB to simulate a shift status change
      await AttendanceRecordRepository.updateByIdAndTenant(recordIn._id, { attendanceStatus: 'PRESENT' }, orgId);

      const emitSpy = vi.spyOn(EventBus, 'emit');
      await AttendanceClockService.clockOut({ userId, gpsData, deviceData, organizationId: orgId });

      const statusChangedEmissions = emitSpy.mock.calls.filter(call => call[0] === EVENTS.ATTENDANCE.STATUS_CHANGED);
      expect(statusChangedEmissions.length).toBeGreaterThanOrEqual(1);
      expect(statusChangedEmissions[0][1]).toEqual(
        expect.objectContaining({
          recordId: recordIn._id,
          employeeId: employeeId,
          organizationId: orgId,
          previousStatus: 'PRESENT',
          newStatus: expect.any(String)
        })
      );
    });

    it('throws NotFoundError if employee profile does not exist during clock out', async () => {
      await expect(
        AttendanceClockService.clockOut({ userId: new mongoose.Types.ObjectId(), gpsData, deviceData, organizationId: orgId })
      ).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError if no open clock-in session is found', async () => {
      await expect(
        AttendanceClockService.clockOut({ userId, gpsData, deviceData, organizationId: orgId })
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError if the open record somehow already has a CLOCK_OUT event', async () => {
      const recordIn = await AttendanceClockService.clockIn({ userId, gpsData, deviceData, organizationId: orgId });
      
      const fakeRecordWithOut = { ...recordIn.toObject(), attendanceEvents: [...recordIn.attendanceEvents, { eventType: 'CLOCK_OUT' }] };
      vi.spyOn(AttendanceRecordRepository, 'findOpenRecord').mockResolvedValueOnce(fakeRecordWithOut);

      await expect(
        AttendanceClockService.clockOut({ userId, gpsData, deviceData, organizationId: orgId })
      ).rejects.toThrow(ConflictError);
    });
  });
});
