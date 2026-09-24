import { describe, it, expect } from 'vitest';
import { PayrollCalculationEngine, StatutoryDeductionEngine } from '#@/modules/payroll/services/index.js';

describe('Payroll Pure Engines Unit Tests', () => {
  describe('StatutoryDeductionEngine', () => {
    it('should correctly compute FIXED statutory deductions', () => {
      const rules = [
        { name: 'Professional Tax', type: 'FIXED', isActive: true, configuration: { amount: 200 } }
      ];
      const result = StatutoryDeductionEngine.calculate({ baseSalary: 50000, grossPay: 60000 }, rules);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: 'Professional Tax', amount: 200, ruleType: 'FIXED' });
    });

    it('should correctly compute PERCENTAGE statutory deductions with maxLimit', () => {
      const rules = [
        { name: 'Provident Fund', type: 'PERCENTAGE', isActive: true, configuration: { rate: 12, baseField: 'baseSalary', maxLimit: 1800 } }
      ];
      const result1 = StatutoryDeductionEngine.calculate({ baseSalary: 10000, grossPay: 15000 }, rules);
      expect(result1[0].amount).toBe(1200);

      const result2 = StatutoryDeductionEngine.calculate({ baseSalary: 20000, grossPay: 25000 }, rules);
      expect(result2[0].amount).toBe(1800); // capped at maxLimit
    });

    it('should correctly compute SLAB statutory deductions', () => {
      const rules = [
        {
          name: 'Income Tax Slab',
          type: 'SLAB',
          isActive: true,
          configuration: {
            baseField: 'grossPay',
            slabs: [
              { min: 0, max: 25000, fixed: 0 },
              { min: 25001, max: 50000, rate: 5 },
              { min: 50001, max: 100000, rate: 10 }
            ]
          }
        }
      ];
      const result = StatutoryDeductionEngine.calculate({ baseSalary: 40000, grossPay: 60000 }, rules);
      expect(result[0].amount).toBe(6000); // 10% of 60000
    });
  });

  describe('PayrollCalculationEngine', () => {
    it('should deterministically compute gross pay, net pay, overtime, LOP, and adjustments without database access', () => {
      const salarySnapshot = {
        baseSalary: 30000,
        components: [
          { name: 'HRA', type: 'EARNING', calculationType: 'PERCENTAGE_OF_BASE', amount: 40 },
          { name: 'Transport Allowance', type: 'EARNING', calculationType: 'FIXED', amount: 2000 },
          { name: 'Canteen Deduction', type: 'DEDUCTION', calculationType: 'FIXED', amount: 500 }
        ]
      };

      const attendanceSnapshot = {
        totalWorkingDays: 30,
        presentDays: 28,
        lopDays: 2,
        overtimeHours: 10
      };

      const leaveSnapshot = {
        paidLeaveDays: 1,
        unpaidLeaveDays: 0
      };

      const statutoryRules = [
        { name: 'PF', type: 'PERCENTAGE', isActive: true, configuration: { rate: 10, baseField: 'baseSalary' } }
      ];

      const formula = {
        lopFormula: 'standard',
        overtimeFormula: 'standard',
        roundingRules: 'NEAREST'
      };

      const adjustments = [
        { reason: 'Performance Bonus', amount: 5000, type: 'BONUS' },
        { reason: 'Late Penalty', amount: 200, type: 'PENALTY' }
      ];

      const res = PayrollCalculationEngine.calculate({
        salarySnapshot,
        attendanceSnapshot,
        leaveSnapshot,
        statutoryRules,
        formula,
        adjustments
      });

      // Base: 30000
      // HRA (40%): 12000
      // Transport: 2000
      // Overtime: (30000 / 30 / 8) * 1.5 * 10 = 125 * 1.5 * 10 = 1875
      // Bonus: 5000
      // Gross Pay Raw: 30000 + 12000 + 2000 + 1875 + 5000 = 50875
      expect(res.grossPay).toBe(50875);

      // Deductions:
      // Canteen: 500
      // PF (10% of 30000): 3000
      // LOP (2 days @ 30000/30 = 1000/day): 2000
      // Penalty: 200
      // Total Deductions Raw: 500 + 3000 + 2000 + 200 = 5700
      // Net Pay Raw: 50875 - 5700 = 45175
      expect(res.netPay).toBe(45175);

      expect(res.breakdown.baseSalary).toBe(30000);
      expect(res.breakdown.overtime).toBe(1875);
      expect(res.breakdown.lopAmount).toBe(2000);
      expect(res.breakdown.allowances).toHaveLength(2);
      expect(res.breakdown.deductions).toHaveLength(2); // Canteen + PF
      expect(res.breakdown.adjustments).toHaveLength(2); // Bonus + Penalty
    });
  });
});
