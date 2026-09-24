import { calculateAttendanceStatus } from '../utils/AttendanceCalculator.js';

/**
 * AttendanceCalculationService — M-05
 *
 * Pure calculation orchestrator. Accepts an AttendanceCalculatorContext
 * and returns derived status and hours by delegating to utility functions.
 *
 * Having this as a service (not just a utility) allows it to be injected,
 * mocked in tests, and extended in the future (e.g., with leave-day checking).
 */
export class AttendanceCalculationService {
  /**
   * Derives attendanceStatus, workingHours, and overtimeHours from the event timeline.
   *
   * @param {Object} ctx - AttendanceCalculatorContext
   * @param {Object} ctx.shiftSnapshot
   * @param {Object} ctx.locationSnapshot
   * @param {Object} ctx.policySnapshot
   * @param {Array}  ctx.attendanceEvents
   * @param {string} ctx.date - YYYY-MM-DD in location timezone
   * @returns {{ attendanceStatus: string, workingHours: number, overtimeHours: number }}
   */
  calculate(ctx) {
    return calculateAttendanceStatus(ctx);
  }
}

export default new AttendanceCalculationService();
