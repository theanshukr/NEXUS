/**
 * TimeCalculator — M-05 Attendance Utility
 *
 * Handles all date/time arithmetic for the Attendance module.
 * All calculations are timezone-aware, resolving dates relative to
 * Location.timezone to correctly handle night shifts and date boundaries.
 */

import { DateTime } from 'luxon';

/**
 * Converts a date to a YYYY-MM-DD string anchored to a specific timezone.
 * This is used to compute the canonical attendance date for an event.
 * For night shifts, the date is locked to the start-of-shift day.
 *
 * @param {Date} date - The UTC timestamp to convert.
 * @param {string} timezone - IANA timezone string (e.g., 'Asia/Kolkata').
 * @returns {string} Date string in YYYY-MM-DD format.
 */
export function toLocalDateString(date, timezone) {
  return DateTime.fromJSDate(date).setZone(timezone).toFormat('yyyy-MM-dd');
}

/**
 * Parses a shift time string (HH:mm) anchored to a specific local date and timezone.
 * Handles night shifts: if the endTime is before startTime, endTime belongs to the next day.
 *
 * @param {string} timeString - Time in HH:mm format.
 * @param {string} dateString - The local date (YYYY-MM-DD) the shift starts on.
 * @param {string} timezone - IANA timezone string.
 * @param {boolean} [nextDay=false] - Whether to resolve to the next calendar day.
 * @returns {DateTime} A Luxon DateTime instance in the given timezone.
 */
export function parseShiftTime(timeString, dateString, timezone, nextDay = false) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return DateTime.fromISO(dateString, { zone: timezone })
    .plus({ days: nextDay ? 1 : 0 })
    .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
}

/**
 * Calculates the number of working minutes between two timestamps.
 * If clockOut is null (missed), returns 0.
 *
 * @param {Date} clockInTime - The effective clock-in time (correctedTime ?? originalTime).
 * @param {Date|null} clockOutTime - The effective clock-out time (correctedTime ?? originalTime).
 * @returns {number} Working time in minutes.
 */
export function calculateWorkingMinutes(clockInTime, clockOutTime) {
  if (!clockOutTime) return 0;
  const inDt = DateTime.fromJSDate(clockInTime);
  const outDt = DateTime.fromJSDate(clockOutTime);
  const diff = outDt.diff(inDt, 'minutes').minutes;
  return Math.max(0, Math.round(diff));
}

/**
 * Determines whether an employee was late for their shift.
 * Lateness is calculated as (clockInTime - shiftStartTime). Grace period is applied.
 *
 * @param {Date} clockInTime
 * @param {string} shiftStartTime - HH:mm
 * @param {string} date - YYYY-MM-DD (the shift date in local timezone)
 * @param {string} timezone - IANA timezone string
 * @param {number} gracePeriodMinutes - Grace period from policy snapshot
 * @returns {{ isLate: boolean, lateByMinutes: number }}
 */
export function calculateLateMinutes(clockInTime, shiftStartTime, date, timezone, gracePeriodMinutes) {
  const shiftStart = parseShiftTime(shiftStartTime, date, timezone);
  const deadline = shiftStart.plus({ minutes: gracePeriodMinutes });
  const clockIn = DateTime.fromJSDate(clockInTime).setZone(timezone);

  const lateByMinutes = Math.max(0, clockIn.diff(deadline, 'minutes').minutes);
  return { isLate: lateByMinutes > 0, lateByMinutes: Math.round(lateByMinutes) };
}

export default { toLocalDateString, parseShiftTime, calculateWorkingMinutes, calculateLateMinutes };
