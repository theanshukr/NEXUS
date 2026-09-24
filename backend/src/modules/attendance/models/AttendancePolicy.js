import mongoose from 'mongoose';

/**
 * AttendancePolicy Mongoose Schema — M-05
 *
 * Defines attendance rules for a location. Policies are evaluated hierarchically:
 *   1. Location-specific policy (if attendancePolicyId is set on Location)
 *   2. Organization-default policy (isDefault: true)
 *   3. Hard-coded system defaults (fallback in AttendancePolicyService)
 *
 * Never put business rules directly into Shift or Employee. All threshold logic lives here.
 */
const attendancePolicySchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  // Flags this as the organization-wide fallback policy.
  // Only one policy per organization may have isDefault: true.
  isDefault: {
    type: Boolean,
    default: false
  },

  // Minutes after shift startTime before the employee is marked LATE.
  lateAfterMinutes: {
    type: Number,
    min: 0,
    default: 15
  },

  // Hours worked below which the day is a HALF_DAY.
  halfDayAfterHours: {
    type: Number,
    min: 0,
    default: 4
  },

  // Minimum hours required to be counted as a full working day.
  minimumWorkingHours: {
    type: Number,
    min: 0,
    default: 8
  },

  // Hours worked above which the remaining time is counted as overtime.
  overtimeStartsAfterHours: {
    type: Number,
    min: 0,
    default: 9
  },

  // If true, clock-ins that fail geofence validation are still APPROVED automatically.
  // Useful for remote-friendly offices.
  autoApproveGeofence: {
    type: Boolean,
    default: false
  },

  // Maximum open session duration in hours before EOD reconciliation marks session as MISSING_CLOCK_OUT.
  maximumOpenAttendanceHours: {
    type: Number,
    min: 1,
    default: 16
  },

  status: {
    type: String,
    enum: ['ACTIVE', 'ARCHIVED'],
    default: 'ACTIVE'
  },
  archivedAt: { type: Date, default: null },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  archiveReason: { type: String, trim: true, default: null }
}, { timestamps: true });

// Only one default policy per organization.
attendancePolicySchema.index({ organizationId: 1, isDefault: 1 });
attendancePolicySchema.index({ organizationId: 1, status: 1 });

export const AttendancePolicy = mongoose.model('AttendancePolicy', attendancePolicySchema);
export default AttendancePolicy;
