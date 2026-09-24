import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  coordinates: {
    latitude: { type: Number, min: -90, max: 90, default: null },
    longitude: { type: Number, min: -180, max: 180, default: null }
  },
  geofenceRadiusMeters: { type: Number, min: 10, default: 50 },
  timezone: { type: String, required: true, trim: true },
  // M-05 Extension: Optional reference to an AttendancePolicy.
  // Resolution order: this field -> organization default policy -> system defaults.
  // If null, AttendancePolicyService falls back to the org default.
  attendancePolicyId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendancePolicy', default: null },
  status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
  archivedAt: { type: Date, default: null },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  archiveReason: { type: String, trim: true, default: null }
}, { timestamps: true });

locationSchema.index({ organizationId: 1, code: 1 }, { unique: true });
locationSchema.index({ organizationId: 1, status: 1 });

export const Location = mongoose.model('Location', locationSchema);
export default Location;

