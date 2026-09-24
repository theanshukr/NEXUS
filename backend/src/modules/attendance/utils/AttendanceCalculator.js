/**
 * AttendanceCalculator — M-05 Attendance Utility
 *
 * Derives the final attendanceStatus (PRESENT, LATE, HALF_DAY, ABSENT)
 * from an AttendanceCalculatorContext object.
 *
 * All business rules (thresholds, grace periods) are consumed exclusively
 * from policySnapshot. This keeps the service layer thin and makes the
 * logic straightforward to unit-test.
 *
 * STABILITY PATCH (1.6):
 * - [F] Fixed incorrect status derivation. Previously, working < halfDayAfterHours
 *       was labelled HALF_DAY (wrong). Corrected status rules:
 *       >= minimumWorkingHours          → PRESENT or LATE
 *       >= halfDayAfterHours            → HALF_DAY
 *       > 0 minutes (below half-day)    → ABSENT (worked but not enough for half-day)
 *       0 minutes (still clocked in)    → optimistic PRESENT or LATE
 */

import { calculateWorkingMinutes, calculateLateMinutes } from './TimeCalculator.js';

/**
 * @typedef {Object} AttendanceCalculatorContext
 * @property {Object} shiftSnapshot - Frozen shift config at clock-in
 * @property {Object} locationSnapshot - Frozen location config at clock-in
 * @property {Object} policySnapshot - Frozen policy config at clock-in
 * @property {Array}  attendanceEvents - The current attendanceEvents array
 * @property {string} date - YYYY-MM-DD (attendance date in local timezone)
 */

/**
 * Resolves the effective time for an event: correctedTime takes priority over originalTime.
 * @param {Object} event
 * @returns {Date}
 */
function effectiveTime(event) {
  return event.correctedTime ? new Date(event.correctedTime) : new Date(event.originalTime);
}

/**
 * Derives a complete attendance status from the context.
 *
 * Status rules (in priority order):
 * 1. No clock-in → return null (reconciliation pending)
 * 2. workingHours >= minimumWorkingHours  → PRESENT (on-time) or LATE
 * 3. workingHours >= halfDayAfterHours    → HALF_DAY
 * 4. workingMinutes > 0                   → ABSENT (below half-day threshold)
 * 5. workingMinutes = 0 (still clocked in) → optimistic PRESENT or LATE
 *
 * @param {AttendanceCalculatorContext} ctx
 * @returns {{ attendanceStatus: string|null, workingHours: number, overtimeHours: number }}
 */
export function calculateAttendanceStatus(ctx) {
  const { shiftSnapshot, locationSnapshot, policySnapshot, attendanceEvents, date } = ctx;
  const timezone = locationSnapshot.timezone;

  const clockInEvent = attendanceEvents.find(e => e.eventType === 'CLOCK_IN');
  const clockOutEvent = attendanceEvents.find(e => e.eventType === 'CLOCK_OUT');

  // No clock-in at all — cannot determine status yet (reconciliation pending).
  if (!clockInEvent) {
    return { attendanceStatus: null, workingHours: 0, overtimeHours: 0 };
  }

  const clockInTime = effectiveTime(clockInEvent);
  const clockOutTime = clockOutEvent ? effectiveTime(clockOutEvent) : null;

  // Calculate raw working time in minutes.
  const workingMinutes = calculateWorkingMinutes(clockInTime, clockOutTime);
  const workingHoursDecimal = workingMinutes / 60;

  // Determine overtime.
  const overtimeThresholdHours = policySnapshot.overtimeStartsAfterHours;
  const overtimeHours = Math.max(0, workingHoursDecimal - overtimeThresholdHours);

  // Determine lateness based on shift start + policy grace period.
  const { isLate } = calculateLateMinutes(
    clockInTime,
    shiftSnapshot.startTime,
    date,
    timezone,
    policySnapshot.lateAfterMinutes
  );

  let attendanceStatus;

  if (!clockOutTime) {
    // Still clocked in (no clock-out yet): optimistic status until they clock out.
    attendanceStatus = isLate ? 'LATE' : 'PRESENT';
  } else if (workingHoursDecimal >= policySnapshot.minimumWorkingHours) {
    // Full working day achieved.
    attendanceStatus = isLate ? 'LATE' : 'PRESENT';
  } else if (workingHoursDecimal >= policySnapshot.halfDayAfterHours) {
    // Worked enough for a half-day but not a full day.
    attendanceStatus = 'HALF_DAY';
  } else {
    // [FIX F] Worked some time but below the half-day threshold.
    // This is NOT a half-day — it is an ABSENT with some presence (e.g. 5 minutes).
    attendanceStatus = 'ABSENT';
  }

  return {
    attendanceStatus,
    workingHours: parseFloat(workingHoursDecimal.toFixed(2)),
    overtimeHours: parseFloat(overtimeHours.toFixed(2))
  };
}

export default { calculateAttendanceStatus };
