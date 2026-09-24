import mongoose from 'mongoose';

const payrollCycleSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  cycleIdentifier: {
    type: String,
    required: true,
    trim: true
  },
  cycleStart: {
    type: String,
    required: true
  },
  cycleEnd: {
    type: String,
    required: true
  },
  payFrequency: {
    type: String,
    enum: ['MONTHLY', 'BIWEEKLY', 'WEEKLY'],
    default: 'MONTHLY',
    required: true
  },
  status: {
    type: String,
    enum: ['OPEN', 'PROCESSING', 'COMPLETED', 'LOCKED'],
    default: 'OPEN',
    index: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    trim: true
  },
  payDate: {
    type: Date,
    required: true
  }
}, { timestamps: true });

payrollCycleSchema.index({ organizationId: 1, cycleIdentifier: 1 }, { unique: true });

export const PayrollCycle = mongoose.model('PayrollCycle', payrollCycleSchema);
export default PayrollCycle;
