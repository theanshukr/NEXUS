import SalaryStructureService from '../services/SalaryStructureService.js';
import SalaryStructureRepository from '../repositories/SalaryStructureRepository.js';
import { ValidationError } from '#@/core/errors/AppError.js';

export const openApiMetadata = {
  createStructure: {
    summary: 'Create Salary Structure',
    description: 'Creates a versioned salary structure and supersedes existing active structure at target level',
    tags: ['Payroll Structure'],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['targetType', 'effectiveFrom', 'components'],
            properties: {
              targetType: { type: 'string', enum: ['EMPLOYEE', 'DESIGNATION', 'DEPARTMENT', 'ORGANIZATION'] },
              targetId: { type: 'string' },
              effectiveFrom: { type: 'string', format: 'date-time' },
              components: { type: 'array', items: { type: 'object' } },
              currency: { type: 'string' },
              roundingRule: { type: 'string' }
            }
          }
        }
      }
    }
  },
  getStructure: { summary: 'Get Salary Structure', description: 'Retrieves salary structure by ID', tags: ['Payroll Structure'] },
  listStructures: { summary: 'List Salary Structures', description: 'Lists salary structures with pagination and filtering', tags: ['Payroll Structure'] }
};

export class SalaryStructureController {
  async createStructure(req, res, next) {
    try {
      const result = await SalaryStructureService.createStructure(
        req.body || {},
        req.user.userId,
        req.user.organizationId
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getStructure(req, res, next) {
    try {
      const repo = new SalaryStructureRepository();
      const structure = await repo.findByIdAndTenant(req.params.id, req.user.organizationId);
      if (!structure) throw new ValidationError('Salary structure not found');
      res.status(200).json({ success: true, data: structure });
    } catch (error) { next(error); }
  }

  async listStructures(req, res, next) {
    try {
      const repo = new SalaryStructureRepository();
      const result = await repo.findPaginated(
        { filter: req.query, page: req.query.page, limit: req.query.limit },
        req.user.organizationId
      );
      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) { next(error); }
  }
}

export default new SalaryStructureController();
