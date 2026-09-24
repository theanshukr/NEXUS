import mongoose from 'mongoose';

/**
 * RefreshToken Schema
 * Stores SHA-256 hashes of rotated, HttpOnly refresh tokens. Enables token rotation and replay detection.
 */
const refreshTokenSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  deviceIp: { type: String, trim: true },
  userAgent: { type: String, trim: true },
  isRevoked: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true, index: true }
}, { timestamps: true });

refreshTokenSchema.index({ userId: 1, isRevoked: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-purge expired tokens

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;
