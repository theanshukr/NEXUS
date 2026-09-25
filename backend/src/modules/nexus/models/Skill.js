import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  canonicalName: {
    type: String,
    required: true,
    trim: true
  },
  normalizedName: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  escoId: {
    type: String,
    default: null
  },
  category: {
    type: String,
    enum: [
      'BACKEND', 'FRONTEND', 'CLOUD_DEVOPS', 'DATA_AI', 'DATABASE', 
      'ARCHITECTURE', 'QA_TESTING', 'SECURITY', 'MANAGEMENT', 
      'SOFT_SKILLS', 'GENERAL'
    ],
    default: 'GENERAL'
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  aliases: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true
});

// Ensure duplicate normalized skills cannot be created per organization
skillSchema.index({ organizationId: 1, normalizedName: 1 }, { unique: true });
// Optional index for ESCO ID lookup within an organization
skillSchema.index({ organizationId: 1, escoId: 1 });

export const Skill = mongoose.model('Skill', skillSchema);
export default Skill;
