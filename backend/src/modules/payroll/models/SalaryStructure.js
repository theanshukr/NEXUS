import mongoose from 'mongoose';

const componentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['EARNING', 'DEDUCTION'],
    required: true
  },
  calculationType: {
    type: String,
    enum: ['FIXED', 'PERCENTAGE_OF_BASE'],
    default: 'FIXED',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const salaryStructureSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['ACTIVE', 'SUPERSEDED'],
    default: 'ACTIVE',
    index: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true
  },
  designationId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    trim: true
  },
  baseSalary: {
    type: Number,
    required: true,
    min: 0
  },
  components: {
    type: [componentSchema],
    default: []
  }
}, { timestamps: true });

salaryStructureSchema.index({ organizationId: 1, employeeId: 1, designationId: 1, departmentId: 1, version: 1 });

export const SalaryStructure = mongoose.model('SalaryStructure', salaryStructureSchema);
export default SalaryStructure;
