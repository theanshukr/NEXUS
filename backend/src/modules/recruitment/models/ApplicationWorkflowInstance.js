import mongoose from 'mongoose';

const applicationWorkflowInstanceSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobApplication',
    required: true,
    unique: true, // One workflow per application
    index: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true
  },
  workflowTemplateVersion: {
    type: Number,
    required: true,
    default: 1
  },
  workflowSnapshot: {
    type: Object, // A complete clone of the HiringWorkflowTemplate at time of application
    required: true
  },
  currentStageId: {
    type: String, // String ID mapping to a specific stage within the snapshot
    required: true
  }
}, { timestamps: true });

export const ApplicationWorkflowInstance = mongoose.model('ApplicationWorkflowInstance', applicationWorkflowInstanceSchema);
export default ApplicationWorkflowInstance;
