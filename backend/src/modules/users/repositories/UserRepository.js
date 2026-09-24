import BaseRepository from '#@/core/repositories/BaseRepository.js';
import User from '#@/modules/users/models/User.js';

export class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmailAndTenant(email, organizationId, options = {}) {
    return await this.findOne({ email: email.toLowerCase().trim() }, organizationId, options);
  }

  async incrementFailedLogins(userId, organizationId, options = {}) {
    return await this.model.findOneAndUpdate(
      this._scopeFilter({ _id: userId }, organizationId),
      { $inc: { failedLoginAttempts: 1 } },
      { returnDocument: 'after', session: options.session || null }
    );
  }

  async lockAccount(userId, lockoutUntil, organizationId, options = {}) {
    return await this.model.findOneAndUpdate(
      this._scopeFilter({ _id: userId }, organizationId),
      { status: 'LOCKED', lockoutUntil },
      { returnDocument: 'after', session: options.session || null }
    );
  }

  async resetFailedLogins(userId, organizationId, options = {}) {
    return await this.model.findOneAndUpdate(
      this._scopeFilter({ _id: userId }, organizationId),
      { failedLoginAttempts: 0, lockoutUntil: null, lastLoginAt: new Date() },
      { returnDocument: 'after', session: options.session || null }
    );
  }
}

export default new UserRepository();
