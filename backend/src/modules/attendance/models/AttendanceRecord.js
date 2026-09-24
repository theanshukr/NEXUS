import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * AttendanceRecord Mongoose Schema — M-05
 *
 * Represents a single working day's attendance for one employee.
 * KEY DESIGN DECISIONS:
 *
 * 1. Timeline-based: Uses attendanceEvents[] instead of top-level clockIn/clockOut
 *    fields. V1 only exposes CLOCK_IN and CLOCK_OUT. Future versions add BREAK_START,
 *    BREAK_END, FIELD_VISIT, etc. without schema redesign.
 *
 * 2. Hard Snapshots: shiftSnapshot, locationSnapshot, geofenceSnapshot, and policySnapshot
 *    are captured at clock-in. Historical records are immune to future HR edits to Shifts,
 *    Locations, or Policies.
 *
 * 3. Dual-status: attendanceStatus (business meaning) and workflowStatus (process state)
 *    are intentionally separate to keep reporting clean.
 *
 * 4. Immutable History: originalTime on each event is never overwritten.
 *    Corrections write to correctedTime instead. correctionDetails tracks who approved what.
 *
 * 5. One record per employee per day: Enforced by a unique compound index.
 */

// Embedded sub-schema for each timeline event (clock-in, clock-out, etc.)
const attendanceEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    default: () => uuidv4()
  },
  eventType: {
    type: String,
    enum: ['CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END'],
    required: true
  },
  // The time originally recorded. NEVER mutated after creation.
  originalTime: {
    type: Date,
    required: true
  },
  // Set by a regularization approval. null unless corrected.
  correctedTime: {
    type: Date,
    default: null
  },
  coordinates: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  geofence: {
    // Machine-readable reason code for the geofence evaluation result.
    status: {
      type: String,
      enum: ['VALID', 'OUTSIDE_RADIUS', 'GPS_INACCURATE', 'LOCATION_DISABLED', 'LOCATION_PERMISSION_DENIED', 'LOCATION_TIMEOUT'],
      default: null
    },
    distanceFromOfficeMeters: { type: Number, default: null },
    gpsAccuracyMeters: { type: Number, default: null }
  },
  device: {
    browser: { type: String, default: null },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
    platform: { type: String, default: null },
    deviceId: { type: String, default: null }
  }
}, { _id: false });


const attendanceRecordSchema = new mongoose.Schema({
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
    index: true
  },

  // Date string in YYYY-MM-DD format, computed relative to Location.timezone at clock-in.
  // This is the canonical key for one-record-per-day enforcement.
  date: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/
  },

  // Reference IDs (for joins) — snapshots below contain the actual values used for calculations.
  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },

  // ---- Hard Snapshots taken at clock-in ----
  // These freeze the configuration at the moment of the event, protecting historical data
  // from future edits to Shifts, Locations, and Policies.
  shiftSnapshot: {
    name: { type: String },
    startTime: { type: String },   // HH:mm
    endTime: { type: String },     // HH:mm
    gracePeriodMinutes: { type: Number },
    isNightShift: { type: Boolean }
  },
  locationSnapshot: {
    name: { type: String },
    timezone: { type: String }
  },
  // Snapshot of the geofence configuration that was evaluated at clock-in.
  // Preserved so historical validations remain reproducible even if the office moves.
  geofenceSnapshot: {
    radiusMeters: { type: Number },
    latitude: { type: Number },
    longitude: { type: Number },
    validationMethod: { type: String, default: 'GPS' }
  },
  policySnapshot: {
    lateAfterMinutes: { type: Number },
    halfDayAfterHours: { type: Number },
    minimumWorkingHours: { type: Number },
    overtimeStartsAfterHours: { type: Number },
    autoApproveGeofence: { type: Boolean }
  },

  // ---- Timeline of Attendance Events ----
  attendanceEvents: {
    type: [attendanceEventSchema],
    default: []
  },

  // ---- Derived Calculations (populated on clock-out or recalculation) ----
  workingHours: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },

  // ---- Dual Status ----
  // Business-facing status (used in reports, payroll).
  attendanceStatus: {
    type: String,
    enum: ['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'HOLIDAY', 'LEAVE', 'WEEKLY_OFF', 'WORK_FROM_HOME', 'REMOTE', 'MISSING_CLOCK_OUT'],
    default: null
  },
  
  // ---- Leave Sync Metadata ----
  isLeave: { type: Boolean, default: false },
  leaveCode: { type: String, default: null },
  leaveRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveRequest', default: null },
  isHalfDay: { type: Boolean, default: false },
  halfDayPeriod: { type: String, enum: ['MORNING', 'AFTERNOON', null], default: null },
  // Process/workflow state (governs what actions are allowed).
  workflowStatus: {
    type: String,
    enum: ['NORMAL', 'REGULARIZATION_PENDING', 'REGULARIZATION_APPROVED', 'REGULARIZATION_REJECTED', 'RECONCILIATION_REQUIRED'],
    default: 'NORMAL'
  },

  // Populated when a regularization is approved.
  correctionDetails: {
    reason: { type: String, default: null },
    correctedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    correctedAt: { type: Date, default: null }
  },

  // ---- M-05.5 Lifecycle & Payroll Consumption Contract ----
  // Attendance lifecycle state machine flag. Once true, record is immutable by normal clock/regularization flows.
  isFinalized: {
    type: Boolean,
    default: false
  },
  
  // ---- Conflict Resolution ----
  conflictStatus: {
    type: String,
    enum: ['NONE', 'PENDING_REVIEW', 'RESOLVED', 'OVERRIDDEN'],
    default: 'NONE'
  },
  conflictReason: { type: String, default: null },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt: { type: Date, default: null },
  resolutionType: { type: String, default: null },
  resolutionNotes: { type: String, default: null },
  
  // ---- Reconciliation Pipeline Metadata (Phase 5) ----
  isFinalized: {
    type: Boolean,
    default: false,
    index: true
  },
  // Payroll lifecycle state machine, owned and triggered by M-07 Payroll Engine via AttendanceReconciliationService.
  payrollStatus: {
    type: String,
    enum: ['NOT_PROCESSED', 'PROCESSING', 'PROCESSED', 'LOCKED'],
    default: 'NOT_PROCESSED',
    index: true
  }
}, { timestamps: true });

// One attendance record per employee per working day.
attendanceRecordSchema.index({ organizationId: 1, employeeId: 1, date: 1 }, { unique: true });
// Efficient team/date-range queries for reports.
attendanceRecordSchema.index({ organizationId: 1, date: 1 });
// Manager team view: filter by direct reports.
attendanceRecordSchema.index({ organizationId: 1, employeeId: 1, attendanceStatus: 1 });
// Aggregation filter performance.
attendanceRecordSchema.index({ organizationId: 1, attendanceStatus: 1 });
// Workflow processing: find pending regularizations.
attendanceRecordSchema.index({ organizationId: 1, workflowStatus: 1 });

export const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema);
export default AttendanceRecord;
