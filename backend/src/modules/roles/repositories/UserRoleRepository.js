import BaseRepository from '#@/core/repositories/BaseRepository.js';
import UserRole from '#@/modules/roles/models/UserRole.js';

export class UserRoleRepository extends BaseRepository {
  constructor() {
    super(UserRole);
  }

  async findRolesByUser(userId, organizationId, options = {}) {
    return await this.model.find(this._scopeFilter({ userId }, organizationId)).populate('roleId').session(options.session || null);
  }

  async findUsersByRole(roleId, organizationId, options = {}) {
    return await this.model.find(this._scopeFilter({ roleId }, organizationId)).populate('userId').session(options.session || null);
  }

  async removeRoleFromUser(userId, roleId, organizationId, options = {}) {
    return await this.model.findOneAndDelete(this._scopeFilter({ userId, roleId }, organizationId), { session: options.session || null });
  }

  async countUsersWithRole(roleId, organizationId, options = {}) {
    return await this.countDocuments({ roleId }, organizationId, options);
  }
}

export default new UserRoleRepository();
