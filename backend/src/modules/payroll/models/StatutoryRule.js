import mongoose from 'mongoose';

const statutoryRuleSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['FIXED', 'PERCENTAGE', 'SLAB', 'FORMULA'],
    required: true
  },
  configuration: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, { timestamps: true });

statutoryRuleSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const StatutoryRule = mongoose.model('StatutoryRule', statutoryRuleSchema);
export default StatutoryRule;
