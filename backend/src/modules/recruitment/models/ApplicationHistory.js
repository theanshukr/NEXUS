import mongoose from 'mongoose';

const applicationHistorySchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobApplication',
    required: true,
    index: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: [
      'Applied', 'Screened', 
      'Interview Scheduled', 'Interview Completed', 'Interview Cancelled',
      'Offer Created', 'Offer Sent', 'Offer Accepted', 'Offer Declined', 'Offer Withdrawn',
      'Rejected', 'Hired', 'Withdrawn',
      'Stage Advanced'
    ],
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId, // Could be User or Candidate
    required: true
  },
  performedByType: {
    type: String,
    enum: ['User', 'Candidate', 'System'],
    default: 'User'
  },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  comment: { type: String },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: false }); // Explicitly disable since we have timestamp field

export const ApplicationHistory = mongoose.model('ApplicationHistory', applicationHistorySchema);
export default ApplicationHistory;
