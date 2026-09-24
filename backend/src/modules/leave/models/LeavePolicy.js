import mongoose from 'mongoose';

const leavePolicySchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true
  },
  version: {
    type: Number,
    default: 1,
    index: true
  },
  effectiveFrom: {
    type: Date,
    required: true,
    index: true
  },
  effectiveTo: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  annualAllowance: {
    type: Number,
    required: true,
    min: 0
  },
  accrualFrequency: {
    type: String,
    enum: ['MONTHLY', 'ANNUAL', 'EVENT_BASED', 'NONE'],
    default: 'ANNUAL'
  },
  accrualRate: {
    type: Number,
    default: 0
  },
  maxCarryForward: {
    type: Number,
    default: 0
  },
  isEncashable: {
    type: Boolean,
    default: false
  },
  escalationRules: {
    managerApprovalLimit: {
      type: Number,
      default: 5
    },
    requireHrApproval: {
      type: Boolean,
      default: false
    },
    requireDocuments: {
      type: Boolean,
      default: false
    },
    minConsecutiveDaysForDoc: {
      type: Number,
      default: 2
    }
  }
}, { timestamps: true });

// Ensure unique code + version per organization
leavePolicySchema.index({ organizationId: 1, code: 1, version: -1 }, { unique: true });

export default mongoose.models.LeavePolicy || mongoose.model('LeavePolicy', leavePolicySchema);
