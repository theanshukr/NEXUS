import mongoose from 'mongoose';

/**
 * UserRole Schema
 * Many-to-Many join table linking a User to multiple Roles within an organization tenant.
 */
const userRoleSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Prevent assigning the exact same role multiple times to the same user
userRoleSchema.index({ organizationId: 1, userId: 1, roleId: 1 }, { unique: true });

export const UserRole = mongoose.model('UserRole', userRoleSchema);
export default UserRole;
