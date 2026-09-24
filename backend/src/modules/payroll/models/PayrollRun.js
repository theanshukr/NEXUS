import mongoose from 'mongoose';

const payrollInputSnapshotSchema = new mongoose.Schema({
  formulaVersion: {
    type: Number,
    required: true
  },
  statutoryRuleVersions: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  organizationSettings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const payrollRunSchema = new mongoose.Schema({
  organizationId: {
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
  status: {
    type: String,
    enum: ['DRAFT', 'PROCESSING', 'COMPLETED', 'LOCKED', 'FAILED'],
    default: 'DRAFT',
    index: true
  },
  totalGross: {
    type: Number,
    default: 0
  },
  totalNet: {
    type: Number,
    default: 0
  },
  runByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  payrollInputSnapshot: {
    type: payrollInputSnapshotSchema,
    default: () => ({})
  }
}, { timestamps: true });

payrollRunSchema.index({ organizationId: 1, payrollCycleId: 1, createdAt: -1 });
payrollRunSchema.index(
  { organizationId: 1, payrollCycleId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['DRAFT', 'PROCESSING', 'COMPLETED', 'LOCKED'] } },
    name: 'unique_active_run_per_cycle'
  }
);

export const PayrollRun = mongoose.model('PayrollRun', payrollRunSchema);
export default PayrollRun;
