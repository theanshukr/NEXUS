import PayrollFormulaRepository from '../repositories/PayrollFormulaRepository.js';
import CacheService from '#@/platform/cache/index.js';
import logger from '#@/platform/logger/index.js';
import { AppError } from '#@/core/errors/AppError.js';

const CACHE_TTL = 3600; // 1 hour

export class PayrollFormulaService {
  constructor(repository = new PayrollFormulaRepository()) {
    this.repository = repository;
  }

  _getCacheKey(organizationId) {
    return `payrollFormula:active:${organizationId}`;
  }

  async invalidateCache(organizationId) {
    await CacheService.delete(this._getCacheKey(organizationId));
  }

  async getActiveFormula(organizationId, options = {}) {
    const cacheKey = this._getCacheKey(organizationId);
    const cached = await CacheService.get(cacheKey);
    if (cached && !options.session) {
      return cached;
    }

    let formula = await this.repository.findActiveFormula(organizationId, options);
    if (!formula) {
      // Create default formula if none exists
      formula = await this.repository.createScoped({
        version: 1,
        effectiveFrom: new Date(),
        lopFormula: 'baseSalary / totalWorkingDays * lopDays',
        overtimeFormula: '(baseSalary / totalWorkingDays / 8) * 1.5 * overtimeHours',
        roundingRules: 'NEAREST',
        isActive: true
      }, organizationId, options);
      logger.info({ organizationId }, 'Initialized default PayrollFormula');
    }

    if (!options.session) {
      await CacheService.set(cacheKey, formula, CACHE_TTL);
    }
    return formula;
  }

  async createNewVersion(data, organizationId, options = {}) {
    const currentActive = await this.repository.findActiveFormula(organizationId, options);
    if (currentActive) {
      await this.repository.updateByIdAndTenant(currentActive._id, {
        isActive: false,
        effectiveTo: new Date()
      }, organizationId, options);
    }

    const nextVersion = await this.repository.getNextVersion(organizationId, options);
    const newFormula = await this.repository.createScoped({
      ...data,
      version: nextVersion,
      effectiveFrom: new Date(),
      isActive: true
    }, organizationId, options);

    await this.invalidateCache(organizationId);
    return newFormula;
  }
}

export default new PayrollFormulaService();
