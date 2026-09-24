import PayrollCycleService from '../services/PayrollCycleService.js';
import { ValidationError } from '#@/core/errors/AppError.js';

export const openApiMetadata = {
  createCycle: {
    summary: 'Create Payroll Cycle',
    description: 'Creates a new payroll cycle in OPEN state',
    tags: ['Payroll Cycle'],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['cycleIdentifier', 'cycleStart', 'cycleEnd', 'payFrequency'],
            properties: {
              cycleIdentifier: { type: 'string' },
              cycleStart: { type: 'string', format: 'date-time' },
              cycleEnd: { type: 'string', format: 'date-time' },
              payFrequency: { type: 'string', enum: ['MONTHLY', 'BIWEEKLY', 'WEEKLY'] },
              payDate: { type: 'string', format: 'date-time' },
              currency: { type: 'string' }
            }
          }
        }
      }
    }
  },
  getCycle: { summary: 'Get Payroll Cycle', description: 'Retrieves payroll cycle by ID', tags: ['Payroll Cycle'] },
  listCycles: { summary: 'List Payroll Cycles', description: 'Lists payroll cycles with pagination and filtering', tags: ['Payroll Cycle'] },
  updateStatus: {
    summary: 'Update Cycle Status',
    description: 'Updates status of payroll cycle enforcing state machine rules',
    tags: ['Payroll Cycle'],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['status'],
            properties: {
              status: { type: 'string', enum: ['OPEN', 'PROCESSING', 'COMPLETED', 'LOCKED'] }
            }
          }
        }
      }
    }
  }
};

export class PayrollCycleController {
  async createCycle(req, res, next) {
    try {
      const cycle = await PayrollCycleService.createCycle(req.body || {}, req.user.organizationId);
      res.status(201).json({ success: true, data: cycle });
    } catch (error) { next(error); }
  }

  async getCycle(req, res, next) {
    try {
      const cycle = await PayrollCycleService.getCycleById(req.params.id, req.user.organizationId);
      res.status(200).json({ success: true, data: cycle });
    } catch (error) { next(error); }
  }

  async listCycles(req, res, next) {
    try {
      const result = await PayrollCycleService.listCycles(
        { filter: req.query, page: req.query.page, limit: req.query.limit },
        req.user.organizationId
      );
      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) { next(error); }
  }

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body || {};
      if (!status) throw new ValidationError('status is required');
      const updated = await PayrollCycleService.updateStatus(req.params.id, status, req.user.organizationId);
      res.status(200).json({ success: true, data: updated });
    } catch (error) { next(error); }
  }
}

export default new PayrollCycleController();
