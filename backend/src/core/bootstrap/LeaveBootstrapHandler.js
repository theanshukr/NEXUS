import OrganizationBootstrapRegistry from '#@/core/bootstrap/OrganizationBootstrapRegistry.js';
import LeavePolicyRepository from '#@/modules/leave/repositories/LeavePolicyRepository.js';
import logger from '#@/platform/logger/index.js';

class LeaveBootstrapHandler {
  constructor() {
    this.priority = 40; // Run after HR/roles
  }

  async execute(organizationId, payload, session) {
    logger.info(`LeaveBootstrapHandler: Provisioning default leave policies for org ${organizationId}`);

    const defaultPolicies = [
      { code: 'CL', name: 'Casual Leave', annualAllowance: 12, accrualFrequency: 'MONTHLY', accrualRate: 1 },
      { code: 'SL', name: 'Sick Leave', annualAllowance: 12, accrualFrequency: 'MONTHLY', accrualRate: 1, escalationRules: { requireDocuments: true, minConsecutiveDaysForDoc: 2 } },
      { code: 'EL', name: 'Earned Leave', annualAllowance: 15, accrualFrequency: 'MONTHLY', accrualRate: 1.25, isEncashable: true, maxCarryForward: 45 },
      { code: 'ML', name: 'Maternity Leave', annualAllowance: 180, accrualFrequency: 'NONE', accrualRate: 0, escalationRules: { requireHrApproval: true, requireDocuments: true, minConsecutiveDaysForDoc: 1 } },
      { code: 'PL', name: 'Paternity Leave', annualAllowance: 15, accrualFrequency: 'NONE', accrualRate: 0, escalationRules: { requireDocuments: true, minConsecutiveDaysForDoc: 1 } },
      { code: 'LWP', name: 'Leave Without Pay', annualAllowance: 365, accrualFrequency: 'NONE', accrualRate: 0, escalationRules: { requireHrApproval: true } }
    ];

    const now = new Date();

    for (const p of defaultPolicies) {
      await LeavePolicyRepository.createScoped({
        ...p,
        version: 1,
        effectiveFrom: now,
        isActive: true
      }, organizationId, { session });
    }

    logger.info(`LeaveBootstrapHandler: Provisioned ${defaultPolicies.length} policies for org ${organizationId}`);
  }
}

const handler = new LeaveBootstrapHandler();
OrganizationBootstrapRegistry.register('LeaveBootstrapHandler', handler.execute.bind(handler), handler.priority);

export default handler;
