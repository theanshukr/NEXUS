import BaseRepository from '#@/core/repositories/BaseRepository.js';
import Role from '#@/modules/roles/models/Role.js';

export class RoleRepository extends BaseRepository {
  constructor() {
    super(Role);
  }

  async findByNameAndTenant(name, organizationId, options = {}) {
    return await this.findOne({ name: name.trim() }, organizationId, options);
  }

  async findByIdsAndTenant(roleIds, organizationId, options = {}) {
    return await this.find({ _id: { $in: roleIds }, status: 'ACTIVE' }, organizationId, options);
  }

  async findActiveRoles(organizationId, options = {}) {
    return await this.find({ status: 'ACTIVE' }, organizationId, options);
  }

  async archiveRole(roleId, organizationId, options = {}) {
    return await this.updateByIdAndTenant(roleId, { status: 'ARCHIVED' }, organizationId, options);
  }
}

export default new RoleRepository();
