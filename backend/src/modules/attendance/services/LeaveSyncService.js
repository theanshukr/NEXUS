import AttendanceRecordRepository from '../repositories/AttendanceRecordRepository.js';
import CalendarService from '#@/modules/calendar/services/CalendarService.js';
import { runInTransaction } from '#@/platform/database/db.js';
import logger from '#@/platform/logger/index.js';

class LeaveSyncService {
  /**
   * Synchronizes an approved leave into the attendance records.
   * Finds or creates records for the leave dates (excluding weekends/holidays).
   */
  async markLeave(payload) {
    const { organizationId, employeeId, leaveRequestId, leaveCode, startDate, endDate, isHalfDay, halfDayPeriod } = payload;

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // We don't want to fail the event listener, so we try-catch and log
    try {
      await runInTransaction(async (session) => {
        let currentDate = new Date(start);
        
        while (currentDate <= end) {
          // Check if it's a net working day
          const netDays = await CalendarService.calculateNetWorkingDays(organizationId, currentDate, currentDate);
          
          if (netDays > 0) {
            // It's a working day. Find or create attendance record.
            const dateStr = currentDate.toISOString().split('T')[0];
            const queryDate = new Date(dateStr);

            let record = await AttendanceRecordRepository.findOne({
              employeeId,
              date: dateStr
            }, organizationId, { session });

            if (!record) {
              const EmployeeRepository = (await import('#@/modules/employees/repositories/EmployeeRepository.js')).default;
              const emp = await EmployeeRepository.findByIdAndTenant(employeeId, organizationId);
              
              if (emp && emp.shiftId && emp.locationId) {
                // Create it
                record = await AttendanceRecordRepository.createScoped({
                  employeeId,
                  date: dateStr,
                  attendanceStatus: 'LEAVE',
                  isLeave: true,
                  leaveCode,
                  leaveRequestId,
                  isHalfDay,
                  halfDayPeriod,
                  shiftId: emp.shiftId,
                  locationId: emp.locationId,
                  originalTime: new Date()
                }, organizationId, { session });
              } else {
                logger.warn(`LeaveSyncService: Could not sync LEAVE for employee ${employeeId} on ${dateStr} - missing shiftId or locationId`);
              }
            } else {
              // Check for conflict
              const hasPresence = record.attendanceEvents.some(e => e.eventType === 'CLOCK_IN') || 
                                  record.attendanceStatus === 'PRESENT' || 
                                  record.attendanceStatus === 'LATE' ||
                                  record.isRegularized;

              if (hasPresence) {
                await AttendanceRecordRepository.updateByIdAndTenant(record._id, {
                  conflictStatus: 'PENDING_REVIEW',
                  conflictReason: 'Leave approved but employee has clock-in or regularization.'
                }, organizationId, { session });
              } else {
                // Safe to update
                await AttendanceRecordRepository.updateByIdAndTenant(record._id, {
                  attendanceStatus: 'LEAVE',
                  isLeave: true,
                  leaveCode,
                  leaveRequestId,
                  isHalfDay,
                  halfDayPeriod
                }, organizationId, { session });
              }
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });
      logger.info(`LeaveSyncService: Successfully synced LEAVE.APPROVED for request ${leaveRequestId}`);
    } catch (error) {
      logger.error(`LeaveSyncService: Failed to sync LEAVE.APPROVED for request ${leaveRequestId}`, error);
    }
  }

  /**
   * Reverts attendance records for cancelled leaves back to ABSENT/unmarked.
   */
  async removeLeave(payload) {
    const { organizationId, employeeId, leaveRequestId } = payload;
    
    try {
      await runInTransaction(async (session) => {
        // Find all records that were marked as LEAVE for this request
        const records = await AttendanceRecordRepository.find({
          employeeId,
          leaveRequestId
        }, organizationId, { session });

        for (const record of records) {
          const hasPresence = record.attendanceEvents.some(e => e.eventType === 'CLOCK_IN') || 
                              record.isRegularized;
          
          if (hasPresence) {
            // Flag conflict instead of blindly reverting
            await AttendanceRecordRepository.updateByIdAndTenant(record._id, {
              conflictStatus: 'PENDING_REVIEW',
              conflictReason: 'Leave cancelled but attendance or regularization exists.'
            }, organizationId, { session });
          } else {
            // Revert to absent
            await AttendanceRecordRepository.updateByIdAndTenant(record._id, {
              attendanceStatus: 'ABSENT',
              isLeave: false,
              leaveCode: null,
              leaveRequestId: null,
              isHalfDay: false,
              halfDayPeriod: null
            }, organizationId, { session });
          }
        }
      });
      logger.info(`LeaveSyncService: Successfully synced LEAVE.CANCELLED for request ${leaveRequestId}`);
    } catch (error) {
      logger.error(`LeaveSyncService: Failed to sync LEAVE.CANCELLED for request ${leaveRequestId}`, error);
    }
  }
}

export default new LeaveSyncService();
