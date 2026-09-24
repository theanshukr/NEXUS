import EventBus from '#@/core/events/EventBus.js';
import EVENTS from '#@/core/constants/events/index.js';
import LeaveSyncService from '../services/LeaveSyncService.js';
import logger from '#@/platform/logger/index.js';

class LeaveEventListener {
  register() {
    EventBus.on(EVENTS.LEAVE?.APPROVED || 'LEAVE.APPROVED', async (payload) => {
      try {
        await LeaveSyncService.markLeave(payload);
      } catch (error) {
        logger.error('LeaveEventListener: Failed processing LEAVE.APPROVED event', error);
      }
    });

    EventBus.on(EVENTS.LEAVE?.CANCELLED || 'LEAVE.CANCELLED', async (payload) => {
      try {
        await LeaveSyncService.removeLeave(payload);
      } catch (error) {
        logger.error('LeaveEventListener: Failed processing LEAVE.CANCELLED event', error);
      }
    });
  }
}

export default new LeaveEventListener();
