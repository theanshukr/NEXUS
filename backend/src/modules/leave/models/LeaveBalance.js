import mongoose from 'mongoose';

const balanceEntrySchema = new mongoose.Schema({
  policyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeavePolicy',
    required: true
  },
  policyVersion: {
    type: Number,
    required: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  totalAllocated: { type: Number, default: 0 },
  accrued: { type: Number, default: 0 },
  used: { type: Number, default: 0 },
  pending: { type: Number, default: 0 },
  carryForward: { type: Number, default: 0 }
}, { _id: false });

const leaveBalanceSchema = new mongoose.Schema({
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
  year: {
    type: Number,
    required: true,
    index: true
  },
  lockVersion: {
    type: Number,
    default: 0
  },
  balances: {
    type: [balanceEntrySchema],
    default: []
  }
}, { timestamps: true });

leaveBalanceSchema.index({ organizationId: 1, employeeId: 1, year: 1 }, { unique: true });

export default mongoose.models.LeaveBalance || mongoose.model('LeaveBalance', leaveBalanceSchema);
