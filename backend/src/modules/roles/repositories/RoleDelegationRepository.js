import { BaseRepository } from '#@/core/repositories/BaseRepository.js';
import RoleDelegationPolicy from '#@/modules/roles/models/RoleDelegationPolicy.js';

export class RoleDelegationRepository extends BaseRepository {
  constructor() {
    super(RoleDelegationPolicy);
  }

  async findBySourceRole(sourceRoleId, organizationId, options = {}) {
    return await this.model.find(
      this._scopeFilter({ sourceRoleId }, organizationId)
    ).populate('targetRoleId').session(options.session || null);
  }

  async findByTargetRole(targetRoleId, organizationId, options = {}) {
    return await this.model.find(
      this._scopeFilter({ targetRoleId }, organizationId)
    ).populate('sourceRoleId').session(options.session || null);
  }

  async findBySourceAndTarget(sourceRoleId, targetRoleId, organizationId, options = {}) {
    return await this.model.findOne(
      this._scopeFilter({ sourceRoleId, targetRoleId }, organizationId)
    ).session(options.session || null);
  }

  async createManyScoped(policies, organizationId, options = {}) {
    const docs = policies.map(p => ({ ...p, organizationId }));
    return await this.model.insertMany(docs, { session: options.session || null });
  }
}

export default new RoleDelegationRepository();
