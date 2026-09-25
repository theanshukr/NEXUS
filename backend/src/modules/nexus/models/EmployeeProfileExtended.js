import mongoose from 'mongoose';
import { employeeSkillSchema } from './EmployeeSkill.js';

/**
 * EmployeeProfileExtended Schema — Nexus Intelligence Layer
 * Stores rich competency, project history, certifications, and career aspirations
 * decoupled from the core HR Employee record for zero-risk extension.
 */
const employeeProfileExtendedSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    unique: true,
    index: true
  },
  headline: {
    type: String,
    trim: true,
    default: 'Software Engineer'
  },
  summary: {
    type: String,
    trim: true,
    default: ''
  },
  totalExperienceYears: {
    type: Number,
    default: 0
  },
  currentLocation: {
    type: String,
    trim: true,
    default: 'Bangalore, India (Hybrid)'
  },
  githubUrl: {
    type: String,
    trim: true
  },
  linkedinUrl: {
    type: String,
    trim: true
  },

  // 1. Unified Skills Matrix
  skills: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['BACKEND', 'FRONTEND', 'CLOUD_DEVOPS', 'DATA_AI', 'DATABASE', 'ARCHITECTURE', 'QA_TESTING', 'SECURITY', 'MANAGEMENT', 'SOFT_SKILLS', 'GENERAL'],
      default: 'GENERAL'
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
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    }
  }],

  // 1b. Canonical Skills Matrix (New Architecture)
  // Replaces the legacy free-text skills array with normalized relational skills
  employeeSkills: [employeeSkillSchema],

  // 2. Experience History
  experience: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    company: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    startDate: {
      type: String,
      required: true
    },
    endDate: {
      type: String,
      default: 'Present'
    },
    current: {
      type: Boolean,
      default: false
    },
    description: {
      type: String,
      trim: true
    },
    technologies: [{
      type: String,
      trim: true
    }]
  }],

  // 3. Project History
  projects: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    technologies: [{
      type: String,
      trim: true
    }],
    duration: {
      type: String,
      trim: true
    },
    impact: {
      type: String,
      trim: true
    },
    link: {
      type: String,
      trim: true
    }
  }],

  // 4. Certifications
  certifications: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    issuer: {
      type: String,
      required: true,
      trim: true
    },
    issueDate: {
      type: String
    },
    expiryDate: {
      type: String
    },
    credentialId: {
      type: String,
      trim: true
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'VERIFIED'
    }
  }],

  // 5. Career & Growth Preferences
  careerPreferences: {
    desiredRoles: [{
      type: String,
      trim: true
    }],
    targetSkills: [{
      type: String,
      trim: true
    }],
    interestDomains: [{
      type: String,
      trim: true
    }],
    willingToRelocate: {
      type: Boolean,
      default: false
    },
    preferredWorkMode: {
      type: String,
      enum: ['REMOTE', 'HYBRID', 'ONSITE'],
      default: 'HYBRID'
    }
  }
}, {
  timestamps: true
});

export const EmployeeProfileExtended = mongoose.model('EmployeeProfileExtended', employeeProfileExtendedSchema);
export default EmployeeProfileExtended;
