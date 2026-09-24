import PayrollCycleRepository from '../repositories/PayrollCycleRepository.js';
import PayrollStateMachineService from './PayrollStateMachineService.js';
import { AppError } from '#@/core/errors/AppError.js';
import logger from '#@/platform/logger/index.js';
import EventBus from '#@/core/events/EventBus.js';
import PAYROLL_EVENTS from '#@/core/constants/events/payroll.js';

export class PayrollCycleService {
  constructor(repository = new PayrollCycleRepository()) {
    this.repository = repository;
  }

  async createCycle({
    cycleIdentifier,
    cycleStart,
    cycleEnd,
    payFrequency = 'MONTHLY',
    currency = 'USD',
    payDate
  }, organizationId, options = {}) {
    if (!cycleIdentifier || !cycleStart || !cycleEnd || !payDate) {
      throw new AppError('cycleIdentifier, cycleStart, cycleEnd, and payDate are required', 400);
    }

    const existing = await this.repository.findByIdentifier(cycleIdentifier, organizationId, options);
    if (existing) {
      throw new AppError(`Payroll cycle [${cycleIdentifier}] already exists for this organization`, 409);
    }

    const cycle = await this.repository.createScoped({
      cycleIdentifier,
      cycleStart,
      cycleEnd,
      payFrequency,
      currency,
      payDate,
      status: 'OPEN'
    }, organizationId, options);

    try {
      EventBus.emit(PAYROLL_EVENTS.CYCLE_CREATED, {
        organizationId,
        cycleId: cycle._id,
        cycleIdentifier,
        payFrequency
      });
    } catch (err) {
      logger.error({ err }, 'Failed to emit PAYROLL.CYCLE_CREATED event');
    }

    return cycle;
  }

  async updateStatus(cycleId, newStatus, organizationId, options = {}) {
    const cycle = await this.repository.findByIdAndTenant(cycleId, organizationId, options);
    if (!cycle) {
      throw new AppError('Payroll cycle not found', 404);
    }

    PayrollStateMachineService.validateTransition('PayrollCycle', cycle.status, newStatus);

    const updated = await this.repository.updateByIdAndTenant(cycle._id, {
      status: newStatus
    }, organizationId, options);

    try {
      EventBus.emit(PAYROLL_EVENTS.CYCLE_STATUS_CHANGED, {
        organizationId,
        cycleId: updated._id,
        cycleIdentifier: updated.cycleIdentifier,
        oldStatus: cycle.status,
        newStatus: updated.status
      });
    } catch (err) {
      logger.error({ err }, 'Failed to emit PAYROLL.CYCLE_STATUS_CHANGED event');
    }

    return updated;
  }

  async getCycleById(cycleId, organizationId, options = {}) {
    const cycle = await this.repository.findByIdAndTenant(cycleId, organizationId, options);
    if (!cycle) throw new AppError('Payroll cycle not found', 404);
    return cycle;
  }

  async listCycles(params = {}, organizationId, options = {}) {
    return await this.repository.findPaginated(params, organizationId, options);
  }
}

export default new PayrollCycleService();
