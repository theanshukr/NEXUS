import { v4 as uuidv4 } from 'uuid';
import logger from '#@/platform/logger/index.js';
import AttendanceRecordRepository from '../repositories/AttendanceRecordRepository.js';
import AttendancePolicyService from './AttendancePolicyService.js';
import AttendanceCalculationService from './AttendanceCalculationService.js';
import EmployeeRepository from '#@/modules/employees/repositories/EmployeeRepository.js';
import ShiftRepository from '#@/modules/organization/repositories/ShiftRepository.js';
import LocationRepository from '#@/modules/organization/repositories/LocationRepository.js';
import HolidayCalendarRepository from '#@/modules/organization/repositories/HolidayCalendarRepository.js';
import AuditService from '#@/modules/audit/services/AuditService.js';
import EventBus from '#@/core/events/EventBus.js';
import EVENTS from '#@/core/constants/events/index.js';
import { toLocalDateString } from '../utils/TimeCalculator.js';
import { validateGeofence } from '../utils/GeoFenceCalculator.js';
import { ConflictError, NotFoundError, ValidationError, ForbiddenError } from '#@/core/errors/AppError.js';

/**
 * AttendanceClockService — M-05
 *
 * Owns the clock-in and clock-out operations.
 * Responsibilities:
 * - Validate the explicit pipeline (Active Employee -> Holiday -> Shift -> Location -> Policy -> Geofence)
 * - Snapshot all reference data at the moment of clock-in
 * - Push events into the AttendanceRecord.attendanceEvents timeline
 * - Delegate calculation to AttendanceCalculationService
 * - Emit domain events for downstream consumers
 *
 * STABILITY PATCH (1.6):
 * - [E] Night shift fix: clockOut() uses findOpenRecord() instead of date-based lookup.
 * - [D] Explicit guards for missing shiftId / locationId on Employee.
 * - [U] Concurrency guard: E11000 from DB converted to ConflictError.
 * - [P] Null coordinate safety is enforced by GeoFenceCalculator (see utility).
 */
export class AttendanceClockService {

  /**
   * Executes the full clock-in pipeline.
   *
   * @param {Object} params
   * @param {string} params.userId - The authenticated user's M-01 userId
   * @param {Object} params.gpsData - { lat, lng, gpsAccuracyMeters, geofenceFailureReason }
   * @param {Object} params.deviceData - { browser, userAgent, ip, platform, deviceId }
   * @param {string} params.organizationId
   * @returns {Promise<Object>} The created AttendanceRecord
   */
  async clockIn({ userId, gpsData, deviceData, organizationId }) {

    // ── Step 1: Resolve Employee ──────────────────────────────────────────────
    const employee = await EmployeeRepository.findByUserId(userId, organizationId);
    if (!employee) throw new NotFoundError('Employee profile not found for this user.');

    // ── Step 2: Validate Employment Status ────────────────────────────────────
    if (employee.status !== 'ACTIVE') {
      throw new ForbiddenError(`Cannot mark attendance. Employee status is '${employee.status}'.`);
    }

    // ── Step 3: Validate required assignments ─────────────────────────────────
    // [FIX D] Explicit guard — employees can be onboarded without shift/location.
    if (!employee.shiftId) {
      throw new ValidationError('Cannot clock in: employee does not have a shift assigned. Contact HR.');
    }
    if (!employee.locationId) {
      throw new ValidationError('Cannot clock in: employee does not have a work location assigned. Contact HR.');
    }

    // ── Step 4: Resolve Shift ─────────────────────────────────────────────────
    const shift = await ShiftRepository.findByIdAndTenant(employee.shiftId, organizationId);
    if (!shift) throw new NotFoundError('Assigned shift no longer exists. Contact HR.');
    if (shift.status !== 'ACTIVE') throw new ValidationError(`Assigned shift '${shift.name}' is archived. Contact HR.`);

    // ── Step 5: Resolve Location ──────────────────────────────────────────────
    const location = await LocationRepository.findByIdAndTenant(employee.locationId, organizationId);
    if (!location) throw new NotFoundError('Assigned work location no longer exists. Contact HR.');
    if (location.status !== 'ACTIVE') throw new ValidationError(`Assigned location '${location.name}' is archived. Contact HR.`);

    // ── Step 6: Resolve Policy (hierarchical) — pass already-fetched location ─
    // [FIX S] Pass the location object we already have to avoid a second DB fetch.
    const policySnapshot = await AttendancePolicyService.resolveForLocationObject(location, organizationId);

    // ── Step 7: Determine attendance date in local timezone ────────────────────
    const now = new Date();
    const timezone = location.timezone;
    const attendanceDate = toLocalDateString(now, timezone);

    // ── Step 8a: Guard — block if record is already finalized or locked ────────
    const existing = await AttendanceRecordRepository.findByEmployeeAndDate(
      employee._id, attendanceDate, organizationId
    );
    if (existing) {
      if (existing.isFinalized || existing.payrollStatus === 'LOCKED') {
        throw new ConflictError('Cannot clock in: attendance for this date is finalized or locked for payroll.');
      }
      const hasClockedIn = existing.attendanceEvents.some(e => e.eventType === 'CLOCK_IN');
      if (hasClockedIn) throw new ConflictError('Already clocked in for today. Please clock out first.');
    }

    // ── Step 8b: Prevent duplicate clock-in across open stale sessions ────────
    const openRecord = await AttendanceRecordRepository.findOpenRecord(employee._id, organizationId);
    if (openRecord && String(openRecord._id) !== String(existing?._id)) {
      throw new ConflictError(`Cannot clock in: you already have an open attendance session from ${openRecord.date}. Please clock out or regularize your previous session first.`);
    }

    // ── Step 9: Holiday check ─────────────────────────────────────────────────
    const year = parseInt(attendanceDate.split('-')[0], 10);
    const holidayCalendar = await HolidayCalendarRepository.findByLocationAndYear(
      location._id, year, organizationId
    );
    if (holidayCalendar) {
      const todayHoliday = holidayCalendar.holidays.find(
        h => toLocalDateString(h.date, timezone) === attendanceDate && h.type === 'MANDATORY'
      );
      if (todayHoliday) {
        throw new ValidationError(`Cannot clock in: '${todayHoliday.name}' is a mandatory holiday.`);
      }
    }

    // ── Step 10: Geofence validation ──────────────────────────────────────────
    // [FIX P] GeoFenceCalculator now returns LOCATION_DISABLED if officeLat/officeLng is null.
    const geofenceResult = validateGeofence({
      lat: gpsData.lat,
      lng: gpsData.lng,
      gpsAccuracyMeters: gpsData.gpsAccuracyMeters,
      officeLat: location.coordinates?.latitude ?? null,
      officeLng: location.coordinates?.longitude ?? null,
      allowedRadiusMeters: location.geofenceRadiusMeters,
      geofenceFailureReason: gpsData.geofenceFailureReason || null
    });

    const geofenceSnapshot = {
      radiusMeters: location.geofenceRadiusMeters,
      latitude: location.coordinates?.latitude ?? null,
      longitude: location.coordinates?.longitude ?? null,
      validationMethod: 'GPS'
    };

    // Block clock-in if geofence fails, unless policy auto-approves.
    if (geofenceResult.status !== 'VALID' && !policySnapshot.autoApproveGeofence) {
      const distMsg = geofenceResult.distanceFromOfficeMeters != null
        ? `You are ${geofenceResult.distanceFromOfficeMeters}m from the office (allowed: ${location.geofenceRadiusMeters}m).`
        : '';
      throw new ValidationError(
        `Geofence validation failed: ${geofenceResult.status}. ${distMsg}`.trim()
      );
    }

    // ── Step 11: Build the CLOCK_IN event ─────────────────────────────────────
    const clockInEvent = {
      eventId: uuidv4(),
      eventType: 'CLOCK_IN',
      originalTime: now,
      correctedTime: null,
      coordinates: { lat: gpsData.lat, lng: gpsData.lng },
      geofence: {
        status: geofenceResult.status,
        distanceFromOfficeMeters: geofenceResult.distanceFromOfficeMeters,
        gpsAccuracyMeters: geofenceResult.gpsAccuracyMeters
      },
      device: {
        browser: deviceData?.browser || null,
        userAgent: deviceData?.userAgent || null,
        ip: deviceData?.ip || null,
        platform: deviceData?.platform || null,
        deviceId: deviceData?.deviceId || null
      }
    };

    // ── Step 12: Determine initial attendance status ───────────────────────────
    const calcCtx = {
      shiftSnapshot: {
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        gracePeriodMinutes: shift.gracePeriodMinutes,
        isNightShift: shift.isNightShift
      },
      locationSnapshot: { name: location.name, timezone },
      policySnapshot,
      attendanceEvents: [clockInEvent],
      date: attendanceDate
    };
    const { attendanceStatus } = AttendanceCalculationService.calculate(calcCtx);

    // ── Step 13: Persist the AttendanceRecord ─────────────────────────────────
    // [FIX U] Wrap in try-catch to convert MongoDB duplicate-key errors (E11000) into
    // a clean ConflictError. This handles the race condition where two simultaneous
    // clock-in requests both pass the findByEmployeeAndDate check before either is inserted.
    let record;
    try {
      record = await AttendanceRecordRepository.createScoped({
        employeeId: employee._id,
        date: attendanceDate,
        shiftId: employee.shiftId,
        shiftSnapshot: calcCtx.shiftSnapshot,
        locationId: employee.locationId,
        locationSnapshot: calcCtx.locationSnapshot,
        geofenceSnapshot,
        policySnapshot,
        attendanceEvents: [clockInEvent],
        attendanceStatus,
        workflowStatus: 'NORMAL',
        workingHours: 0,
        overtimeHours: 0
      }, organizationId);
    } catch (err) {
      if (err.code === 11000) {
        throw new ConflictError('Already clocked in for today (concurrent request detected).');
      }
      throw err;
    }

    await AuditService.logAction({
      organizationId,
      actorId: userId,
      action: 'ATTENDANCE_CLOCK_IN',
      entityType: 'AttendanceRecord',
      entityId: record._id,
      newValue: { date: attendanceDate, status: attendanceStatus, geofenceStatus: geofenceResult.status }
    });

    logger.info({ organizationId, employeeId: employee._id, date: attendanceDate, attendanceStatus }, 'Clock-in recorded');
    EventBus.emit(EVENTS.ATTENDANCE.CLOCKED_IN, {
      recordId: record._id,
      employeeId: employee._id,
      organizationId,
      timestamp: now.toISOString(),
      status: attendanceStatus
    });

    return record;
  }

  /**
   * Executes the clock-out operation.
   * Uses findOpenRecord() to locate the active session regardless of calendar date.
   *
   * NIGHT SHIFT FIX [E]: Clock-out must NOT compute attendanceDate from "now".
   * A worker who clocked in at 22:00 (date=D) clocking out at 06:00 (date=D+1)
   * would have their date computed as D+1, and a findByEmployeeAndDate lookup
   * would find nothing. findOpenRecord() finds the session by event type instead.
   *
   * @param {Object} params
   * @param {string} params.userId
   * @param {Object} params.gpsData
   * @param {Object} params.deviceData
   * @param {string} params.organizationId
   * @returns {Promise<Object>} The finalized AttendanceRecord
   */
  async clockOut({ userId, gpsData, deviceData, organizationId }) {
    const now = new Date();

    // ── Step 1: Resolve Employee ──────────────────────────────────────────────
    const employee = await EmployeeRepository.findByUserId(userId, organizationId);
    if (!employee) throw new NotFoundError('Employee profile not found for this user.');

    // ── Step 2: Find the open record (date-agnostic for night shift safety) ───
    // [FIX E] Uses findOpenRecord() — finds any record with CLOCK_IN but no CLOCK_OUT.
    const record = await AttendanceRecordRepository.findOpenRecord(employee._id, organizationId);
    if (!record) {
      throw new NotFoundError('No active clock-in session found. Please clock in first.');
    }

    // ── Step 3: Guard — verify record not finalized/locked or already clocked out ─
    if (record.isFinalized || record.payrollStatus === 'LOCKED') {
      throw new ConflictError('Cannot clock out: attendance for this session is finalized or locked for payroll.');
    }
    const hasClockedOut = record.attendanceEvents.some(e => e.eventType === 'CLOCK_OUT');
    if (hasClockedOut) throw new ConflictError('Already clocked out for this session.');

    // ── Step 4: Geofence for clock-out — use geofenceSnapshot from clock-in ──
    // This ensures mid-day location changes don't affect clock-out validation.
    const geofenceResult = validateGeofence({
      lat: gpsData.lat,
      lng: gpsData.lng,
      gpsAccuracyMeters: gpsData.gpsAccuracyMeters,
      officeLat: record.geofenceSnapshot?.latitude ?? null,
      officeLng: record.geofenceSnapshot?.longitude ?? null,
      allowedRadiusMeters: record.geofenceSnapshot?.radiusMeters,
      geofenceFailureReason: gpsData.geofenceFailureReason || null
    });

    // ── Step 5: Build the CLOCK_OUT event ─────────────────────────────────────
    const clockOutEvent = {
      eventId: uuidv4(),
      eventType: 'CLOCK_OUT',
      originalTime: now,
      correctedTime: null,
      coordinates: { lat: gpsData.lat, lng: gpsData.lng },
      geofence: {
        status: geofenceResult.status,
        distanceFromOfficeMeters: geofenceResult.distanceFromOfficeMeters,
        gpsAccuracyMeters: geofenceResult.gpsAccuracyMeters
      },
      device: {
        browser: deviceData?.browser || null,
        userAgent: deviceData?.userAgent || null,
        ip: deviceData?.ip || null,
        platform: deviceData?.platform || null,
        deviceId: deviceData?.deviceId || null
      }
    };

    const updatedEvents = [...record.attendanceEvents, clockOutEvent];

    // ── Step 6: Recalculate status and hours using frozen snapshots ────────────
    const calcCtx = {
      shiftSnapshot: record.shiftSnapshot,
      locationSnapshot: record.locationSnapshot,
      policySnapshot: record.policySnapshot,
      attendanceEvents: updatedEvents,
      date: record.date
    };
    const { attendanceStatus, workingHours, overtimeHours } = AttendanceCalculationService.calculate(calcCtx);
    const previousStatus = record.attendanceStatus;

    // ── Step 7: Persist ───────────────────────────────────────────────────────
    const updated = await AttendanceRecordRepository.updateByIdAndTenant(record._id, {
      attendanceEvents: updatedEvents,
      attendanceStatus,
      workingHours,
      overtimeHours
    }, organizationId);

    await AuditService.logAction({
      organizationId,
      actorId: userId,
      action: 'ATTENDANCE_CLOCK_OUT',
      entityType: 'AttendanceRecord',
      entityId: record._id,
      newValue: { date: record.date, workingHours, attendanceStatus }
    });

    logger.info({
      organizationId, employeeId: employee._id,
      date: record.date, workingHours, attendanceStatus
    }, 'Clock-out recorded');

    EventBus.emit(EVENTS.ATTENDANCE.CLOCKED_OUT, {
      recordId: record._id,
      employeeId: employee._id,
      organizationId,
      timestamp: now.toISOString(),
      workingHours
    });

    if (previousStatus !== attendanceStatus) {
      EventBus.emit(EVENTS.ATTENDANCE.STATUS_CHANGED, {
        recordId: record._id,
        employeeId: employee._id,
        organizationId,
        timestamp: now.toISOString(),
        previousStatus,
        newStatus: attendanceStatus
      });
    }

    return updated;
  }
}

export default new AttendanceClockService();
