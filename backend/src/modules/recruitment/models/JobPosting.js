import mongoose from 'mongoose';
import { EMPLOYMENT_TYPE, WORK_MODE } from '#@/core/constants/employment.js';

const jobPostingSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  jobRequisitionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobRequisition',
    required: true,
    unique: true, // One active posting per requisition
    index: true
  },
  jobRequisitionVersion: {
    type: Number,
    required: true,
    default: 1
  },
  slug: {
    type: String,
    required: true,
    index: true
  },
  visibility: {
    type: String,
    enum: ['PUBLIC', 'INTERNAL', 'PRIVATE'],
    default: 'PUBLIC'
  },
  
  // Snapshot Data (Sanitized for public consumption)
  title: { type: String, required: true },
  description: { type: String, required: true },
  department: { type: String, required: true }, // Name of department, not ID, for easy querying
  location: { type: String, required: true },
  city: { type: String },
  country: { type: String },
  isRemote: { type: Boolean, default: false },
  employmentType: {
    type: String,
    enum: Object.values(EMPLOYMENT_TYPE),
    required: true
  },
  workMode: {
    type: String,
    enum: Object.values(WORK_MODE),
    required: true
  },
  skills: [{ type: String }],
  benefits: [{ type: String }],
  requirements: { type: String }, // Optional pre-rendered requirements block
  
  // Lifecycle
  status: {
    type: String,
    enum: ['PUBLISHED', 'CLOSED'],
    default: 'PUBLISHED'
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  applicationCount: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    default: null
  },
  publishedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound index for querying active jobs by org
jobPostingSchema.index({ organizationId: 1, status: 1 });

export const JobPosting = mongoose.model('JobPosting', jobPostingSchema);
export default JobPosting;
