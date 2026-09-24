import { AppError } from '#@/core/errors/AppError.js';
import logger from '#@/platform/logger/index.js';

export class PayrollStateMachineService {
  static CYCLE_TRANSITIONS = {
    OPEN: ['PROCESSING', 'CLOSED'],
    PROCESSING: ['COMPLETED', 'LOCKED', 'OPEN', 'FAILED'],
    COMPLETED: ['LOCKED', 'OPEN'],
    LOCKED: [],
    CLOSED: ['OPEN']
  };

  static RUN_TRANSITIONS = {
    DRAFT: ['PROCESSING'],
    PROCESSING: ['COMPLETED', 'FAILED'],
    COMPLETED: ['LOCKED'],
    FAILED: ['PROCESSING', 'DRAFT'],
    LOCKED: []
  };

  static PAYSLIP_TRANSITIONS = {
    DRAFT: ['FINALIZED'],
    FINALIZED: []
  };

  /**
   * Validates state transition and throws AppError if illegal.
   */
  static validateTransition(entityType, currentStatus, newStatus) {
    if (currentStatus === newStatus) return true;

    let transitionsMap;
    switch (entityType) {
      case 'PayrollCycle':
        transitionsMap = this.CYCLE_TRANSITIONS;
        break;
      case 'PayrollRun':
        transitionsMap = this.RUN_TRANSITIONS;
        break;
      case 'Payslip':
        transitionsMap = this.PAYSLIP_TRANSITIONS;
        break;
      default:
        throw new AppError(`Unknown entity type for state machine: ${entityType}`, 500);
    }

    const allowed = transitionsMap[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      logger.warn({
        entityType,
        currentStatus,
        newStatus
      }, `Illegal state transition attempted on ${entityType}`);
      throw new AppError(
        `Illegal state transition for ${entityType}: cannot transition from [${currentStatus}] to [${newStatus}]. Allowed transitions: [${allowed.join(', ')}]`,
        400
      );
    }
    return true;
  }
}

export default PayrollStateMachineService;
