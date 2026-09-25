import mongoose from 'mongoose';

export const employeeSkillSchema = new mongoose.Schema({
  skillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true
  },
  proficiency: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    default: 'Intermediate'
  },
  yearsOfExperience: {
    type: Number,
    default: 1
  },
  source: {
    type: String,
    enum: ['AI_EXTRACTED', 'SELF_REPORTED', 'MANAGER_VERIFIED', 'PEER_ENDORSED'],
    default: 'SELF_REPORTED'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.9
  },
  verificationStatus: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'REJECTED'],
    default: 'PENDING'
  },
  evidence: {
    type: String,
    trim: true,
    default: ''
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

export default employeeSkillSchema;
