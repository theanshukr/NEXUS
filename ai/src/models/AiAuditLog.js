import mongoose from 'mongoose';

const { Schema, Types: { ObjectId } } = mongoose;

/**
 * AiAuditLog — Immutable tamper-evident record of every AI conversation turn.
 *
 * Owned entirely by the AI Platform (stored in nexusops_ai database).
 * Used for: compliance audits, debugging, cost attribution, and security reviews.
 *
 * IMMUTABILITY ENFORCEMENT:
 *   Pre-update and pre-delete hooks throw fatal errors to prevent tampering.
 */
const aiAuditLogSchema = new Schema({
  organizationId:  { type: ObjectId, required: true, index: true },
  userId:          { type: ObjectId, required: true, index: true },
  sessionId:       { type: String,   required: true, index: true },
  correlationId:   { type: String,   required: true, unique: true },

  promptText:      { type: String,   required: true },
  responseText:    { type: String,   default: '' },

  provider:        { type: String,   enum: ['GeminiProvider', 'GroqProvider', 'OpenRouterProvider', 'UNKNOWN'], default: 'UNKNOWN' },
  model:           { type: String },

  toolsInvoked:    [{
    name:            { type: String, required: true },
    args:            { type: Schema.Types.Mixed },
    result:          { type: Schema.Types.Mixed },
    executionTimeMs: { type: Number },
    status:          { type: String, enum: ['SUCCESS', 'ERROR', 'RBAC_DENIED'] },
  }],

  inputTokens:     { type: Number, default: 0 },
  outputTokens:    { type: Number, default: 0 },
  totalCostUsd:    { type: Number, default: 0 },
  totalLatencyMs:  { type: Number, default: 0 },

  executionStatus: { type: String, enum: ['SUCCESS', 'PARTIAL', 'FAILED'], default: 'SUCCESS' },
  errorMessage:    { type: String },
}, {
  timestamps: true,
  collection: 'ai_audit_logs',
});

// ── Compound indexes for common query patterns ───────────────────────────────
aiAuditLogSchema.index({ organizationId: 1, createdAt: -1 });
aiAuditLogSchema.index({ userId: 1, createdAt: -1 });
aiAuditLogSchema.index({ sessionId: 1, createdAt: 1 });

// ── Immutability guards ──────────────────────────────────────────────────────
function preventMutation() {
  throw new Error('[AiAuditLog] FATAL: Audit log records are immutable. Update and delete operations are prohibited.');
}

aiAuditLogSchema.pre('findOneAndUpdate', preventMutation);
aiAuditLogSchema.pre('updateOne', preventMutation);
aiAuditLogSchema.pre('updateMany', preventMutation);
aiAuditLogSchema.pre('findOneAndDelete', preventMutation);
aiAuditLogSchema.pre('deleteOne', preventMutation);
aiAuditLogSchema.pre('deleteMany', preventMutation);

export const AiAuditLog = mongoose.model('AiAuditLog', aiAuditLogSchema);
export default AiAuditLog;
