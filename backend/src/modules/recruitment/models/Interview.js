import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobApplication',
    required: true,
    index: true
  },
  workflowInstanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApplicationWorkflowInstance',
    required: true
  },
  stageId: {
    type: String, // String representation of the stage ObjectId from the snapshot
    required: true
  },
  round: {
    type: Number,
    required: true,
    default: 1
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  interviewType: {
    type: String,
    enum: ['ONLINE', 'OFFLINE', 'PHONE'],
    required: true
  },
  scheduledStart: {
    type: Date,
    required: true
  },
  scheduledEnd: {
    type: Date,
    required: true
  },
  timezone: {
    type: String,
    required: true
  },
  meetingUrl: {
    type: String,
    trim: true,
    default: null
  },
  location: {
    type: String,
    trim: true,
    default: null
  },
  interviewerIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
    default: 'SCHEDULED'
  },
  
  // Evaluation fields
  evaluatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  technicalScore: { type: Number, min: 0, max: 100 },
  communicationScore: { type: Number, min: 0, max: 100 },
  cultureScore: { type: Number, min: 0, max: 100 },
  overallScore: { type: Number, min: 0, max: 100 },
  recommendation: {
    type: String,
    enum: ['HIRE', 'REJECT', 'HOLD']
  },
  comments: { type: String },
  evaluatedAt: { type: Date },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

export const Interview = mongoose.model('Interview', interviewSchema);
export default Interview;
