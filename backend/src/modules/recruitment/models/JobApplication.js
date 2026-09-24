import mongoose from 'mongoose';

const applicationSourceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['CAREERS_PORTAL', 'REFERRAL', 'LINKEDIN', 'INDEED', 'NAUKRI', 'INTERNAL', 'AGENCY', 'API'],
    required: true
  },
  reference: { type: String },
  metadata: { type: Map, of: String }
}, { _id: false });

const aiEvaluationSchema = new mongoose.Schema({
  resumeScore: { type: Number },
  skillScore: { type: Number },
  experienceScore: { type: Number },
  overallScore: { type: Number },
  summary: { type: String },
  reasoning: { type: String },
  evaluatedAt: { type: Date },
  model: { type: String }
}, { _id: false });

const jobApplicationSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  jobPostingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobPosting',
    required: true,
    index: true
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true,
    index: true
  },
  applicationNumber: {
    type: String,
    required: true,
    unique: true
  },
  workflowInstanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApplicationWorkflowInstance',
    default: null
  },
  
  // Documents (Snapshot for this specific application)
  submittedResumeDocumentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  submittedCoverLetterDocumentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    default: null
  },
  
  status: {
    type: String,
    enum: ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN'],
    default: 'APPLIED'
  },
  
  source: applicationSourceSchema,
  
  expectedSalary: { type: Number },
  noticePeriod: { type: String }, // e.g., '30 Days'
  currentCompany: { type: String },
  currentCTC: { type: String },
  expectedCTC: { type: String },
  availabilityDate: { type: Date },
  
  appliedAt: { type: Date, default: Date.now },
  withdrawnAt: { type: Date },
  rejectedReason: { type: String },
  
  // Placeholder for future ATS AI integrations
  aiEvaluation: aiEvaluationSchema
}, { timestamps: true });

// Ensure a candidate only applies once to a given job posting
jobApplicationSchema.index({ jobPostingId: 1, candidateId: 1 }, { unique: true });

export const JobApplication = mongoose.model('JobApplication', jobApplicationSchema);
export default JobApplication;
