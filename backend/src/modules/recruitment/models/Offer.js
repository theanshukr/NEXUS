import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
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
    unique: true, // One active offer per application (if they withdraw and recreate, they can just update or create new one, but let's keep it simple. Actually, let's not make it unique so we can have multiple revisions).
    index: true
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true,
    index: true
  },
  
  salary: {
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    period: { type: String, enum: ['HOURLY', 'MONTHLY', 'YEARLY', 'LPA'], required: true }
  },
  
  designationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
    required: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  
  joiningDate: {
    type: Date,
    required: true
  },
  offerExpiry: {
    type: Date,
    required: true
  },
  notes: {
    type: String
  },
  
  status: {
    type: String,
    enum: ['DRAFT', 'SENT', 'PENDING_RESPONSE', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED'],
    default: 'DRAFT'
  },
  
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

export const Offer = mongoose.model('Offer', offerSchema);
export default Offer;
