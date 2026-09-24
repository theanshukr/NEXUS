import BaseRepository from '#@/core/repositories/BaseRepository.js';
import LeavePolicy from '../models/LeavePolicy.js';

class LeavePolicyRepository extends BaseRepository {
  constructor() {
    super(LeavePolicy);
  }

  async findActiveByCode(organizationId, code) {
    const policies = await this.find({
      code,
      isActive: true
    }, organizationId);
    return policies.length > 0 ? policies[0] : null;
  }

  async findActivePolicies(organizationId) {
    return await this.find({ isActive: true }, organizationId);
  }

  async findByCodeAndVersion(organizationId, code, version) {
    const policies = await this.find({ code, version }, organizationId);
    return policies.length > 0 ? policies[0] : null;
  }

  /**
   * Archives a policy by setting effectiveTo = now and isActive = false.
   */
  async archivePolicy(organizationId, policyId, session = null) {
    return await this.updateByIdAndTenant(
      policyId,
      {
        isActive: false,
        effectiveTo: new Date()
      },
      organizationId,
      { session, returnDocument: 'after' }
    );
  }
}

export default new LeavePolicyRepository();
