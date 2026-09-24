import mongoose from 'mongoose';

const snapshotSchema = new mongoose.Schema({
  accrued: { type: Number, required: true },
  used: { type: Number, required: true },
  pending: { type: Number, required: true },
  carryForward: { type: Number, required: true }
}, { _id: false });

const leaveBalanceLedgerSchema = new mongoose.Schema({
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
  leavePolicyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeavePolicy',
    required: true
  },
  leavePolicyVersion: {
    type: Number,
    required: true
  },
  leaveCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true
  },
  year: {
    type: Number,
    required: true,
    index: true
  },
  eventType: {
    type: String,
    enum: [
      'ACCRUAL', 
      'LEAVE_REQUESTED', 
      'LEAVE_APPROVED', 
      'LEAVE_REJECTED', 
      'LEAVE_CANCELLED', 
      'MANUAL_ADJUSTMENT', 
      'CARRY_FORWARD',
      'INITIALIZATION'
    ],
    required: true
  },
  daysDelta: {
    type: Number,
    required: true
  },
  previousBalance: {
    type: snapshotSchema,
    required: true
  },
  newBalance: {
    type: snapshotSchema,
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null // ref to LeaveRequest or AccrualBatch
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

export default mongoose.models.LeaveBalanceLedger || mongoose.model('LeaveBalanceLedger', leaveBalanceLedgerSchema);
