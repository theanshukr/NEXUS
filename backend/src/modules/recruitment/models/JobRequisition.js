import mongoose from 'mongoose';

// If a requisition has a custom workflow, it's structurally identical to the template stages
const CustomHiringStageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['SCREENING', 'INTERVIEW', 'ASSESSMENT', 'OFFER'], required: true },
  order: { type: Number, required: true },
  isRequired: { type: Boolean, default: true },
  aiEnabled: { type: Boolean, default: false },
  defaultEvaluatorRoles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
  scorecardTemplateId: { type: mongoose.Schema.Types.ObjectId, default: null }
}, { _id: true });

const JobRequisitionSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  jobCode: {
    type: String,
    required: true,
    index: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  reportingManagerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  employmentType: {
    type: String,
    enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY', 'FREELANCE'],
    required: true
  },
  workMode: {
    type: String,
    enum: ['ONSITE', 'HYBRID', 'REMOTE'],
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  minimumExperienceYears: {
    type: Number,
    required: true,
    min: 0
  },
  maximumExperienceYears: {
    type: Number,
    required: true,
    min: 0
  },
  technicalRequirements: [{
    skillId: { type: mongoose.Schema.Types.ObjectId, default: null }, // Nullable if skill is custom entered
    name: { type: String, required: true },
    level: { type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'], required: true },
    mandatory: { type: Boolean, default: true },
    weight: { type: Number, default: 0 }
  }],
  salary: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    currency: { type: String, required: true },
    period: { type: String, enum: ['HOURLY', 'MONTHLY', 'YEARLY', 'LPA'], required: true }
  },
  openPositions: {
    type: Number,
    required: true,
    min: 1
  },
  filledPositions: {
    type: Number,
    default: 0
  },
  workflowTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HiringWorkflowTemplate',
    default: null
  },
  customWorkflow: [CustomHiringStageSchema],
  approvalWorkflowTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApprovalWorkflowTemplate',
    default: null
  },
  aiConfiguration: {
    enabled: { type: Boolean, default: false },
    minimumResumeScore: { type: Number, default: 0 }
  },
  workflowStatus: {
    type: String,
    enum: ['DRAFT', 'ACTIVE', 'ON_HOLD', 'CLOSED', 'ARCHIVED'],
    default: 'DRAFT'
  },
  approvalStatus: {
    type: String,
    enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
    default: 'DRAFT'
  },
  publishStatus: {
    type: String,
    enum: ['UNPUBLISHED', 'PUBLISHED', 'EXPIRED'],
    default: 'UNPUBLISHED'
  },
  applicationDeadline: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  publishedAt: {
    type: Date,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'jobrequisitions'
});

// Ensure jobCode is unique per organization
JobRequisitionSchema.index({ organizationId: 1, jobCode: 1 }, { unique: true });

export default mongoose.model('JobRequisition', JobRequisitionSchema);
