import mongoose from 'mongoose';

/**
 * Immutable AuditLog Mongoose Schema.
 * Serves as a tamper-evident security and compliance ledger for sensitive administrative actions.
 * Enforces strict immutability by blocking updates and deletions via Mongoose middleware.
 */
const auditLogSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  entityType: {
    type: String,
    required: true,
    trim: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  previousValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

// Enforce ledger immutability
auditLogSchema.statics.preventMutation = function() {
  throw new Error('Security Violation: AuditLog ledger records are strictly immutable.');
};

auditLogSchema.pre('findOneAndUpdate', function() { this.model.preventMutation(); });
auditLogSchema.pre('updateOne', function() { this.model.preventMutation(); });
auditLogSchema.pre('deleteOne', function() { this.model.preventMutation(); });

auditLogSchema.index({ organizationId: 1, timestamp: -1 });
auditLogSchema.index({ organizationId: 1, action: 1, timestamp: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
