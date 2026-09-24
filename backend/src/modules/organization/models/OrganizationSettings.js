import mongoose from 'mongoose';

/**
 * OrganizationSettings Mongoose Schema.
 * Linked 1-to-1 with Organization to separate core tenant identity from operational configuration.
 */
const organizationSettingsSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true,
    index: true
  },
  timezone: {
    type: String,
    default: 'UTC',
    trim: true
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true,
    trim: true
  },
  dateFormat: {
    type: String,
    default: 'YYYY-MM-DD',
    trim: true
  },
  ai: {
    enabled: { type: Boolean, default: true },
    provider: { type: String, default: 'groq', trim: true },
    model: { type: String, default: 'llama-3.3-70b', trim: true }
  },
  enabledModules: [{
    type: String,
    enum: [
      'EMPLOYEE',
      'ATTENDANCE',
      'LEAVE',
      'PAYROLL',
      'RECRUITMENT',
      'PROJECTS',
      'ASSETS',
      'DOCUMENTS',
      'AI_COPILOT'
    ],
    default: ['EMPLOYEE', 'ATTENDANCE', 'LEAVE', 'AI_COPILOT']
  }],
  // M-03 Extension Point: Employee code generation strategy
  employee: {
    codeStrategy: {
      type: String,
      enum: ['MANUAL', 'AUTO'],
      default: 'MANUAL'
    },
    codePrefix: {
      type: String,
      trim: true,
      default: 'EMP'
    },
    codeSequence: {
      type: Number,
      min: 0,
      default: 1000
    }
  }
}, {
  timestamps: true
});

export const OrganizationSettings = mongoose.model('OrganizationSettings', organizationSettingsSchema);
export default OrganizationSettings;
