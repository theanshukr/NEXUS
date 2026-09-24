import mongoose from 'mongoose';

const payslipBreakdownSchema = new mongoose.Schema({
  baseSalary: { type: Number, default: 0 },
  allowances: { type: [mongoose.Schema.Types.Mixed], default: [] },
  overtime: { type: Number, default: 0 },
  deductions: { type: [mongoose.Schema.Types.Mixed], default: [] },
  adjustments: { type: [mongoose.Schema.Types.Mixed], default: [] },
  lopAmount: { type: Number, default: 0 }
}, { _id: false });

const payslipSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  payrollRunId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'PayrollRun',
    index: true
  },
  payrollCycleId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'PayrollCycle',
    index: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['DRAFT', 'FINALIZED'],
    default: 'DRAFT',
    index: true
  },
  breakdown: {
    type: payslipBreakdownSchema,
    default: () => ({})
  },
  netPay: {
    type: Number,
    required: true,
    default: 0
  },
  grossPay: {
    type: Number,
    required: true,
    default: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    trim: true
  },
  salaryStructureSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  attendanceSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  leaveSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  taxSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  formulaVersionSnapshot: { type: Number, default: 1 },
  engineVersion: { type: String, default: '1.0.0' }
}, { timestamps: true });

payslipSchema.index({ organizationId: 1, payrollCycleId: 1, employeeId: 1 }, { unique: true });

export const Payslip = mongoose.model('Payslip', payslipSchema);
export default Payslip;
