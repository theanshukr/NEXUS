/**
 * StatutoryDeductionEngine
 * Pure function engine that dynamically calculates deductions based on statutory rule configurations.
 * Performs zero database calls.
 */
export class StatutoryDeductionEngine {
  /**
   * Calculates deductions from active statutory rules.
   * @param {Object} context - { baseSalary, grossPay }
   * @param {Array<Object>} rules - Array of StatutoryRule objects
   * @returns {Array<Object>} Array of deduction breakdown items `{ name, amount, ruleType }`
   */
  static calculate(context = {}, rules = []) {
    const { baseSalary = 0, grossPay = 0 } = context;
    const deductions = [];

    for (const rule of rules) {
      if (!rule || !rule.isActive) continue;

      let amount = 0;
      const config = rule.configuration || {};

      switch (rule.type) {
        case 'FIXED': {
          amount = Number(config.amount) || 0;
          break;
        }
        case 'PERCENTAGE': {
          const rate = Number(config.rate) || 0; // e.g., 12 for 12%
          const baseField = config.baseField === 'grossPay' ? grossPay : baseSalary;
          amount = (baseField * rate) / 100;
          if (config.maxLimit && amount > Number(config.maxLimit)) {
            amount = Number(config.maxLimit);
          }
          break;
        }
        case 'SLAB': {
          const baseField = config.baseField === 'grossPay' ? grossPay : baseSalary;
          const slabs = Array.isArray(config.slabs) ? config.slabs : [];
          for (const slab of slabs) {
            const min = Number(slab.min) || 0;
            const max = slab.max !== undefined && slab.max !== null ? Number(slab.max) : Infinity;
            if (baseField >= min && baseField <= max) {
              if (slab.fixed !== undefined && slab.fixed !== null) {
                amount = Number(slab.fixed);
              } else if (slab.rate !== undefined && slab.rate !== null) {
                amount = (baseField * Number(slab.rate)) / 100;
              }
              break; // Slab matched
            }
          }
          break;
        }
        case 'FORMULA': {
          // Fallback or custom eval evaluation if safe, otherwise fixed fallback
          amount = Number(config.fallbackAmount) || 0;
          break;
        }
        default:
          break;
      }

      amount = Math.max(0, amount);
      if (amount > 0) {
        deductions.push({
          name: rule.name,
          amount,
          ruleType: rule.type
        });
      }
    }

    return deductions;
  }
}

export default StatutoryDeductionEngine;
