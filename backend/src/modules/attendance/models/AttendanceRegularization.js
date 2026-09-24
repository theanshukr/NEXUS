import mongoose from 'mongoose';

/**
 * AttendanceRegularization Mongoose Schema — M-05
 *
 * Represents a formal workflow request to correct an anomalous AttendanceRecord.
 * This is NOT a generic correction table. It is a business workflow with
 * structured approval states and audit capability.
 *
 * KEY DESIGN DECISIONS:
 * - Targets a specific eventId within AttendanceRecord.attendanceEvents so
 *   future break/session regularizations can be scoped precisely.
 * - requestedTime holds what the employee CLAIMS the actual time was.
 * - The original time on the AttendanceRecord is never overwritten; correctedTime is set instead.
 * - managerId is snapshotted at approval time (manager may change later).
 */
const attendanceRegularizationSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  attendanceRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendanceRecord',
    required: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },

  // The specific event within attendanceEvents that this request targets.
  // Null for FULL_DAY requests where both clock-in and clock-out are missing.
  targetEventId: {
    type: String,
    default: null
  },

  // Snapshot of the approver at approval time. May differ from current managerId.
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },

  // Which type of correction is being requested.
  type: {
    type: String,
    enum: ['CLOCK_IN', 'CLOCK_OUT', 'FULL_DAY'],
    required: true
  },

  // The employee's claimed correct time for the targeted event.
  requestedClockIn: { type: Date, default: null },
  requestedClockOut: { type: Date, default: null },

  // Employee's explanation for the anomaly.
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },

  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
    index: true
  },

  // Populated when manager approves or rejects.
  reviewerComments: {
    type: String,
    trim: true,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

attendanceRegularizationSchema.index({ organizationId: 1, status: 1 });
attendanceRegularizationSchema.index({ organizationId: 1, employeeId: 1, status: 1 });
attendanceRegularizationSchema.index({ organizationId: 1, attendanceRecordId: 1 });

export const AttendanceRegularization = mongoose.model('AttendanceRegularization', attendanceRegularizationSchema);
export default AttendanceRegularization;
