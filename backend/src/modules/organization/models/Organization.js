import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  domain: { type: String, lowercase: true, trim: true },
  settings: {
    currency: { type: String, default: 'USD' },
    timezone: { type: String, default: 'UTC' },
    fiscalYearStartMonth: { type: Number, default: 4 } // e.g., April
  },
  status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'ARCHIVED'], default: 'ACTIVE' }
}, { timestamps: true });

organizationSchema.index({ code: 1 }, { unique: true });
organizationSchema.index({ domain: 1 }, { sparse: true });

export const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
