import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  status: { type: String, enum: ['PENDING_APPROVAL', 'ACTIVE', 'LOCKED', 'SUSPENDED', 'REJECTED'], default: 'PENDING_APPROVAL' },
  failedLoginAttempts: { type: Number, default: 0 },
  lockoutUntil: { type: Date, default: null },
  lastLoginAt: { type: Date, default: null }
}, { timestamps: true });

// Ensure email is unique within the organization tenant boundary
userSchema.index({ organizationId: 1, email: 1 }, { unique: true });
userSchema.index({ organizationId: 1, status: 1 });

export const User = mongoose.model('User', userSchema);
export default User;
