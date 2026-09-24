import mongoose from 'mongoose';

const payrollFormulaSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  version: {
    type: Number,
    required: true,
    default: 1
  },
  effectiveFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  effectiveTo: {
    type: Date,
    default: null
  },
  lopFormula: {
    type: String,
    required: true,
    default: 'baseSalary / totalWorkingDays * lopDays',
    trim: true
  },
  overtimeFormula: {
    type: String,
    required: true,
    default: '(baseSalary / totalWorkingDays / 8) * 1.5 * overtimeHours',
    trim: true
  },
  roundingRules: {
    type: String,
    enum: ['NEAREST', 'UP', 'DOWN', 'NONE'],
    default: 'NEAREST',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, { timestamps: true });

payrollFormulaSchema.index({ organizationId: 1, version: 1 }, { unique: true });

export const PayrollFormula = mongoose.model('PayrollFormula', payrollFormulaSchema);
export default PayrollFormula;
