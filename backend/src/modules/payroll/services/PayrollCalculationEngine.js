import StatutoryDeductionEngine from './StatutoryDeductionEngine.js';

/**
 * PayrollCalculationEngine
 * 100% Pure Mathematics Engine. Performs zero database calls.
 * Takes structured JSON snapshots and outputs deterministic PayrollResult.
 */
export class PayrollCalculationEngine {
  /**
   * Evaluates standard LOP amount without unsafe eval.
   */
  static _calculateLop(baseSalary, totalWorkingDays, lopDays) {
    if (!totalWorkingDays || totalWorkingDays <= 0 || !lopDays || lopDays <= 0) return 0;
    const dailyRate = baseSalary / totalWorkingDays;
    return dailyRate * lopDays;
  }

  /**
   * Evaluates standard Overtime amount without unsafe eval.
   */
  static _calculateOvertime(baseSalary, totalWorkingDays, overtimeHours) {
    if (!totalWorkingDays || totalWorkingDays <= 0 || !overtimeHours || overtimeHours <= 0) return 0;
    const hourlyRate = baseSalary / totalWorkingDays / 8;
    return hourlyRate * 1.5 * overtimeHours;
  }

  /**
   * Applies rounding rules to a numerical value.
   */
  static _round(value, roundingRule = 'NEAREST') {
    const num = Number(value) || 0;
    switch (roundingRule) {
      case 'UP':
        return Math.ceil(num);
      case 'DOWN':
        return Math.floor(num);
      case 'NONE':
        return Number(num.toFixed(2));
      case 'NEAREST':
      default:
        return Math.round(num);
    }
  }

  /**
   * Executes pure calculation on provided snapshots.
   * @param {Object} input
   * @param {Object} input.salarySnapshot
   * @param {Object} input.attendanceSnapshot
   * @param {Object} input.leaveSnapshot
   * @param {Array<Object>} input.statutoryRules
   * @param {Object} input.formula
   * @param {Array<Object>} input.adjustments
   * @returns {Object} PayrollResult `{ grossPay, netPay, breakdown }`
   */
  static calculate(input = {}) {
    const {
      salarySnapshot = {},
      attendanceSnapshot = {},
      leaveSnapshot = {},
      statutoryRules = [],
      formula = {},
      adjustments = []
    } = input;

    const roundingRule = formula.roundingRules || 'NEAREST';
    const baseSalary = Number(salarySnapshot.baseSalary) || 0;
    const totalWorkingDays = Number(attendanceSnapshot.totalWorkingDays) || 30;
    
    // Total LOP days: attendance unpaid/lop days plus leave unpaid leave days
    const attendanceLop = Number(attendanceSnapshot.lopDays) || 0;
    const leaveUnpaid = Number(leaveSnapshot.unpaidLeaveDays) || 0;
    const totalLopDays = attendanceLop + leaveUnpaid;

    const overtimeHours = Number(attendanceSnapshot.overtimeHours) || 0;

    // 1. Allowances & Structure Deductions from SalaryStructure components
    const allowances = [];
    const structureDeductions = [];
    const components = Array.isArray(salarySnapshot.components) ? salarySnapshot.components : [];

    for (const comp of components) {
      let amount = 0;
      if (comp.calculationType === 'PERCENTAGE_OF_BASE') {
        amount = (baseSalary * Number(comp.amount)) / 100;
      } else {
        amount = Number(comp.amount) || 0;
      }
      amount = Math.max(0, amount);

      if (comp.type === 'EARNING') {
        allowances.push({ name: comp.name, amount });
      } else if (comp.type === 'DEDUCTION') {
        structureDeductions.push({ name: comp.name, amount });
      }
    }

    // 2. Calculate Overtime & LOP
    const overtimeAmount = this._calculateOvertime(baseSalary, totalWorkingDays, overtimeHours);
    const lopAmount = this._calculateLop(baseSalary, totalWorkingDays, totalLopDays);

    // 3. Process Ad-hoc Adjustments
    const breakdownAdjustments = [];
    let totalEarningAdjustments = 0;
    let totalDeductionAdjustments = 0;

    for (const adj of adjustments) {
      const amt = Number(adj.amount) || 0;
      const type = adj.type;
      const name = adj.reason || adj.type;

      if (['BONUS', 'REIMBURSEMENT', 'ARREARS'].includes(type) || (type === 'MANUAL' && amt >= 0)) {
        const positiveAmt = Math.abs(amt);
        totalEarningAdjustments += positiveAmt;
        breakdownAdjustments.push({ name, amount: positiveAmt, type, category: 'EARNING' });
      } else if (type === 'PENALTY' || (type === 'MANUAL' && amt < 0)) {
        const positiveAmt = Math.abs(amt);
        totalDeductionAdjustments += positiveAmt;
        breakdownAdjustments.push({ name, amount: positiveAmt, type, category: 'DEDUCTION' });
      }
    }

    // 4. Calculate Gross Pay
    const totalAllowances = allowances.reduce((sum, item) => sum + item.amount, 0);
    const grossPayRaw = baseSalary + totalAllowances + overtimeAmount + totalEarningAdjustments;
    const grossPay = Math.max(0, grossPayRaw);

    // 5. Calculate Statutory Deductions
    const statutoryDeductions = StatutoryDeductionEngine.calculate({ baseSalary, grossPay }, statutoryRules);

    // 6. Combine Deductions
    const allDeductions = [...structureDeductions, ...statutoryDeductions];
    const totalDeductionsRaw = allDeductions.reduce((sum, item) => sum + item.amount, 0) + lopAmount + totalDeductionAdjustments;
    const totalDeductions = Math.max(0, totalDeductionsRaw);

    // 7. Calculate Net Pay
    const netPayRaw = grossPay - totalDeductions;
    const netPay = Math.max(0, netPayRaw);

    return {
      grossPay: this._round(grossPay, roundingRule),
      netPay: this._round(netPay, roundingRule),
      breakdown: {
        baseSalary: this._round(baseSalary, roundingRule),
        allowances: allowances.map(a => ({ ...a, amount: this._round(a.amount, roundingRule) })),
        overtime: this._round(overtimeAmount, roundingRule),
        deductions: allDeductions.map(d => ({ ...d, amount: this._round(d.amount, roundingRule) })),
        adjustments: breakdownAdjustments.map(a => ({ ...a, amount: this._round(a.amount, roundingRule) })),
        lopAmount: this._round(lopAmount, roundingRule)
      }
    };
  }
}

export default PayrollCalculationEngine;
