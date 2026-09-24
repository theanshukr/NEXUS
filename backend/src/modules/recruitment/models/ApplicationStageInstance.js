import mongoose from 'mongoose';

const applicationStageInstanceSchema = new mongoose.Schema({
  workflowInstanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApplicationWorkflowInstance',
    required: true,
    index: true
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobApplication',
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  stageId: {
    type: String, // Maps to a specific stage ID in the workflowSnapshot
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'],
    default: 'PENDING'
  },
  assignedEvaluators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  scheduledAt: { type: Date },
  startedAt: { type: Date },
  completedAt: { type: Date },
  
  // Future AI Evaluation and scoring specific to this stage (e.g. interview analysis)
  aiEvaluation: { type: mongoose.Schema.Types.Mixed },
  scorecards: [{ type: mongoose.Schema.Types.Mixed }],
  comments: { type: String },
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }]
}, { timestamps: true });

export const ApplicationStageInstance = mongoose.model('ApplicationStageInstance', applicationStageInstanceSchema);
export default ApplicationStageInstance;
