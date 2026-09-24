import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * RoleDelegationPolicy (formerly RoleAssignmentPolicy)
 * Defines enterprise role delegation boundaries: Users holding `sourceRoleId` are permitted
 * to assign/delegate `targetRoleId` to other users (via invitations, manual assignment, promotions).
 */
const roleDelegationPolicySchema = new Schema({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required.'],
    index: true
  },
  sourceRoleId: {
    type: Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'Source Role ID is required.'],
    index: true
  },
  targetRoleId: {
    type: Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'Target Role ID is required.'],
    index: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true,
  collection: 'role_delegation_policies'
});

// Enforce unique delegation rule per tenant
roleDelegationPolicySchema.index({ organizationId: 1, sourceRoleId: 1, targetRoleId: 1 }, { unique: true });

const RoleDelegationPolicy = mongoose.model('RoleDelegationPolicy', roleDelegationPolicySchema);

export default RoleDelegationPolicy;
