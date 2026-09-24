import mongoose from 'mongoose';

const snapshotBalanceEntrySchema = new mongoose.Schema({
  policyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeavePolicy',
    required: true
  },
  policyVersion: { type: Number, required: true },
  code: { type: String, required: true },
  totalAllocated: { type: Number, default: 0 },
  accrued: { type: Number, default: 0 },
  used: { type: Number, default: 0 },
  pending: { type: Number, default: 0 },
  carryForward: { type: Number, default: 0 }
}, { _id: false });

const leaveBalanceSnapshotSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // The identifier for the payroll cycle (e.g. "2026-P01", "2026-Jan", or a payrollRunId)
  cycleIdentifier: {
    type: String,
    required: true,
    index: true
  },
  // The exact date/time this snapshot was frozen
  snapshotDate: {
    type: Date,
    required: true
  },
  // The reporting period for this cycle
  cycleStartDate: {
    type: Date,
    required: true
  },
  cycleEndDate: {
    type: Date,
    required: true
  },
  balances: {
    type: [snapshotBalanceEntrySchema],
    default: []
  }
}, { timestamps: true });

// Ensure one snapshot per cycle per employee
leaveBalanceSnapshotSchema.index({ organizationId: 1, employeeId: 1, cycleIdentifier: 1 }, { unique: true });

export default mongoose.models.LeaveBalanceSnapshot || mongoose.model('LeaveBalanceSnapshot', leaveBalanceSnapshotSchema);
