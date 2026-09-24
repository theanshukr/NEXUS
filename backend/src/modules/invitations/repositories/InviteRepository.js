import BaseRepository from '#@/core/repositories/BaseRepository.js';
import Invitation from '#@/modules/invitations/models/Invitation.js';

export class InviteRepository extends BaseRepository {
  constructor() {
    super(Invitation);
  }

  /**
   * Finds an invitation by its SHA-256 token hash.
   * Note: Queried globally during registration before tenant context is known.
   * @param {string} tokenHash 
   */
  async findByTokenHash(tokenHash, options = {}) {
    return await Invitation.findOne({ tokenHash }).populate('defaultRoleIds').session(options.session || null);
  }

  async incrementUsedCount(inviteId, organizationId, options = {}) {
    return await this.model.findOneAndUpdate(
      this._scopeFilter({ _id: inviteId }, organizationId),
      { $inc: { usedCount: 1 } },
      { returnDocument: 'after', session: options.session || null }
    );
  }

  async updateStatus(inviteId, status, organizationId, options = {}) {
    return await this.updateByIdAndTenant(inviteId, { status }, organizationId, options);
  }
}

export default new InviteRepository();
