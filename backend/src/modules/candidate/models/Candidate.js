import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  passwordHash: {
    type: String,
    required: true,
    select: false // Exclude from default queries
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'LOCKED'],
    default: 'ACTIVE'
  },
  lastLogin: {
    type: Date,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// A candidate belongs to one organization, but an email could theoretically 
// be used across different organizations (if they apply to different companies using this platform)
candidateSchema.index({ organizationId: 1, email: 1 }, { unique: true });

export const Candidate = mongoose.model('Candidate', candidateSchema);
export default Candidate;
