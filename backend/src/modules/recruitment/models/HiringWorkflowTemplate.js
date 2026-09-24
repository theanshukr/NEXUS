import mongoose from 'mongoose';

const HiringWorkflowStageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['SCREENING', 'INTERVIEW', 'ASSESSMENT', 'OFFER'],
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  isRequired: {
    type: Boolean,
    default: true
  },
  aiEnabled: {
    type: Boolean,
    default: false
  },
  defaultEvaluatorRoles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  }],
  scorecardTemplateId: {
    type: mongoose.Schema.Types.ObjectId, // Refers to future ScorecardTemplate model
    default: null
  }
}, { _id: true }); // Generate _id for each stage so applications can reference the specific stage

const HiringWorkflowTemplateSchema = new mongoose.Schema({
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
  stages: [HiringWorkflowStageSchema],
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
  collection: 'hiringworkflowtemplates'
});

export default mongoose.model('HiringWorkflowTemplate', HiringWorkflowTemplateSchema);
