import LeaveBalanceRepository from '../repositories/LeaveBalanceRepository.js';
import LeaveBalanceLedgerRepository from '../repositories/LeaveBalanceLedgerRepository.js';
import LeavePolicyRepository from '../repositories/LeavePolicyRepository.js';
import { runInTransaction } from '#@/platform/database/db.js';

class LeaveBalanceService {
  /**
   * Lazily initializes a balance for an employee if it doesn't exist.
   * Automatically assigns all current active policies to the balance.
   */
  async getOrInitializeBalance(organizationId, employeeId, year) {
    let balance = await LeaveBalanceRepository.getEmployeeBalance(organizationId, employeeId, year);
    if (balance) return balance;

    // Initialize balance
    return await runInTransaction(async (session) => {
      // Recheck inside transaction
      let currentBalance = await LeaveBalanceRepository.getEmployeeBalance(organizationId, employeeId, year);
      if (currentBalance) return currentBalance;

      const activePolicies = await LeavePolicyRepository.findActivePolicies(organizationId);
      
      const balances = activePolicies.map(p => ({
        policyId: p._id,
        policyVersion: p.version,
        code: p.code,
        totalAllocated: p.annualAllowance,
        accrued: p.accrualFrequency === 'NONE' ? p.annualAllowance : 0, // If NONE, give full allowance upfront
        used: 0,
        pending: 0,
        carryForward: 0
      }));

      const newBalance = await LeaveBalanceRepository.createScoped({
        employeeId,
        year,
        lockVersion: 0,
        balances
      }, organizationId, { session });

      // Append initialization ledgers
      for (const b of balances) {
        if (b.accrued > 0) {
          await LeaveBalanceLedgerRepository.append(organizationId, {
            employeeId,
            leavePolicyId: b.policyId,
            leavePolicyVersion: b.policyVersion,
            leaveCode: b.code,
            year,
            eventType: 'INITIALIZATION',
            daysDelta: b.accrued,
            previousBalance: { accrued: 0, used: 0, pending: 0, carryForward: 0 },
            newBalance: { accrued: b.accrued, used: 0, pending: 0, carryForward: 0 },
            actorId: employeeId, // system/self
            reason: 'Lazy initialization'
          }, session);
        }
      }

      return newBalance;
    });
  }

  /**
   * Runs monthly accrual batch. 
   * Fetches all active MONTHLY policies and dynamically accrues for employees.
   */
  async runMonthlyAccrual(organizationId) {
    const year = new Date().getFullYear();
    const activePolicies = await LeavePolicyRepository.findActivePolicies(organizationId);
    const monthlyPolicies = activePolicies.filter(p => p.accrualFrequency === 'MONTHLY');
    if (monthlyPolicies.length === 0) return { accruedEmployees: 0 };

    // In a real high-scale environment, this would paginate through employees using a cursor.
    // For now, we fetch all active balances for the year.
    const balances = await LeaveBalanceRepository.find({ year }, organizationId);

    let accruedCount = 0;
    
    for (const balance of balances) {
      await runInTransaction(async (session) => {
        await LeaveBalanceRepository.mutateBalanceWithLock(organizationId, balance.employeeId, year, (lockedBalance) => {
          let hasChanges = false;

          for (const policy of monthlyPolicies) {
            const b = lockedBalance.balances.find(b => b.code === policy.code);
            if (b && b.accrued < policy.annualAllowance) {
              const prevAccrued = b.accrued;
              // Cap at annualAllowance
              const newAccrued = Math.min(prevAccrued + policy.accrualRate, policy.annualAllowance);
              const delta = newAccrued - prevAccrued;
              
              if (delta > 0) {
                b.accrued = newAccrued;
                hasChanges = true;

                // Fire and forget ledger append within session
                LeaveBalanceLedgerRepository.append(organizationId, {
                  employeeId: balance.employeeId,
                  leavePolicyId: policy._id,
                  leavePolicyVersion: policy.version,
                  leaveCode: policy.code,
                  year,
                  eventType: 'ACCRUAL',
                  daysDelta: delta,
                  previousBalance: { accrued: prevAccrued, used: b.used, pending: b.pending, carryForward: b.carryForward },
                  newBalance: { accrued: b.accrued, used: b.used, pending: b.pending, carryForward: b.carryForward },
                  actorId: organizationId,
                  reason: 'Monthly Accrual'
                }, session);
              }
            }
          }

          if (hasChanges) accruedCount++;
        }, session);
      });
    }

    return { accruedEmployees: accruedCount };
  }
}

export default new LeaveBalanceService();
