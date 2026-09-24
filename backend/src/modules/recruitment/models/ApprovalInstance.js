import mongoose from 'mongoose';

const ApprovalInstanceStepSchema = new mongoose.Schema({
  stepId: {
    type: mongoose.Schema.Types.ObjectId, // Maps back to the template's step ID
    required: true
  },
  principalType: {
    type: String,
    enum: ['USER', 'ROLE', 'DEPARTMENT'],
    required: true
  },
  principalId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  actedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  actedAt: {
    type: Date,
    default: null
  },
  comments: {
    type: String,
    default: ''
  }
}, { _id: false });

const ApprovalInstanceSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  requisitionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobRequisition',
    required: true,
    index: true
  },
  currentStep: {
    type: Number,
    default: 1
  },
  steps: [ApprovalInstanceStepSchema],
  status: {
    type: String,
    enum: ['IN_PROGRESS', 'APPROVED', 'REJECTED'],
    default: 'IN_PROGRESS'
  }
}, {
  timestamps: true,
  collection: 'approvalinstances'
});

export default mongoose.model('ApprovalInstance', ApprovalInstanceSchema);
