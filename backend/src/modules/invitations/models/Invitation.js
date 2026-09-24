import mongoose from 'mongoose';

/**
 * Invitation Schema (Secret-Key-Free Tenant Onboarding Engine)
 * Replaces insecure shared corporate secret keys. Stores SHA-256 cryptographic hashes of invite tokens.
 */
const invitationSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true }, // SHA-256 hash of the plaintext token sent in email/link
  email: { type: String, lowercase: true, trim: true },      // Optional: if set, restricts redemption to this email
  defaultRoleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true }],
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  maxUses: { type: Number, required: true, default: 1 },
  usedCount: { type: Number, required: true, default: 0 },
  status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'REVOKED', 'EXHAUSTED'], default: 'ACTIVE' },
  expiresAt: { type: Date, required: true, index: true }
}, { timestamps: true });

invitationSchema.index({ organizationId: 1, status: 1 });
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // MongoDB TTL index auto-clears expired documents if desired, but index allows fast expiry checks

export const Invitation = mongoose.model('Invitation', invitationSchema);
export default Invitation;
