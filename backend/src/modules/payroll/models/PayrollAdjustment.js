import mongoose from 'mongoose';

const payrollAdjustmentSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  payrollCycleId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'PayrollCycle',
    index: true
  },
  cycleIdentifier: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['BONUS', 'REIMBURSEMENT', 'ARREARS', 'PENALTY', 'MANUAL'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  }
}, { timestamps: true });

payrollAdjustmentSchema.index({ organizationId: 1, employeeId: 1, cycleIdentifier: 1 });

export const PayrollAdjustment = mongoose.model('PayrollAdjustment', payrollAdjustmentSchema);
export default PayrollAdjustment;
