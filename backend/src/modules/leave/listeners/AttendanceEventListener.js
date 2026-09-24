import EventBus from '#@/core/events/EventBus.js';
import EVENTS from '#@/core/constants/events/index.js';
import LeaveRequestService from '../services/LeaveRequestService.js';
import logger from '#@/platform/logger/index.js';

class AttendanceEventListener {
  register() {
    EventBus.on(EVENTS.ATTENDANCE?.CONFLICT_RESOLVED || 'ATTENDANCE.CONFLICT_RESOLVED', async (payload) => {
      try {
        await LeaveRequestService.handleAttendanceConflictResolution(payload);
      } catch (error) {
        logger.error('AttendanceEventListener: Failed processing ATTENDANCE.CONFLICT_RESOLVED event', error);
      }
    });
  }
}

export default new AttendanceEventListener();
