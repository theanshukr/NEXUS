import mongoose from 'mongoose';

const { Schema, Types: { ObjectId } } = mongoose;

/**
 * AiUsage — Per-day token cost ledger for tenant billing and analytics.
 *
 * Records are upserted (findOneAndUpdate with upsert:true) — each combination of
 * (organizationId, userId, date, provider) has a single document that accumulates
 * token counts and cost as requests are made throughout the day.
 *
 * Used for:
 *   - Per-tenant AI cost reporting dashboards
 *   - Per-user usage quotas and rate limiting
 *   - Provider cost comparison analytics
 */
const aiUsageSchema = new Schema({
  organizationId:   { type: ObjectId, required: true },
  userId:           { type: ObjectId, required: true },
  date:             { type: Date,     required: true }, // UTC day-level granularity (midnight)
  provider:         { type: String,   required: true },
  model:            { type: String,   required: true },

  promptTokens:     { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  totalCostUsd:     { type: Number, default: 0 },
  requestCount:     { type: Number, default: 0 },
}, {
  timestamps: true,
  collection: 'ai_usage_ledger',
});

// Compound index for the primary upsert query and aggregation reports
aiUsageSchema.index({ organizationId: 1, date: 1, provider: 1 }, { name: 'org_date_provider_idx' });
aiUsageSchema.index({ userId: 1, date: 1 }, { name: 'user_date_idx' });
aiUsageSchema.index({ organizationId: 1, userId: 1, date: 1 }, { name: 'org_user_date_idx' });

export const AiUsage = mongoose.model('AiUsage', aiUsageSchema);
export default AiUsage;
