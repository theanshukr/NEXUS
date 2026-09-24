import BaseRepository from '#@/core/repositories/BaseRepository.js';
import RefreshToken from '#@/modules/auth/models/RefreshToken.js';

export class TokenRepository extends BaseRepository {
  constructor() {
    super(RefreshToken);
  }

  async findByTokenHash(tokenHash) {
    return await RefreshToken.findOne({ tokenHash, isRevoked: false });
  }

  async revokeToken(tokenId, organizationId) {
    return await this.updateByIdAndTenant(tokenId, { isRevoked: true }, organizationId);
  }

  async revokeAllUserTokens(userId, organizationId) {
    return await RefreshToken.updateMany(
      this._scopeFilter({ userId, isRevoked: false }, organizationId),
      { $set: { isRevoked: true } }
    );
  }
}

export default new TokenRepository();
