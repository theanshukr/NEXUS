import mongoose from 'mongoose';

const ApprovalWorkflowStepSchema = new mongoose.Schema({
  order: {
    type: Number,
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
  isRequired: {
    type: Boolean,
    default: true
  }
}, { _id: true });

const ApprovalWorkflowTemplateSchema = new mongoose.Schema({
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
  steps: [ApprovalWorkflowStepSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'approvalworkflowtemplates'
});

export default mongoose.model('ApprovalWorkflowTemplate', ApprovalWorkflowTemplateSchema);
