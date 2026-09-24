import mongoose from 'mongoose';

const salaryRevisionSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  targetType: {
    type: String,
    enum: ['EMPLOYEE', 'DESIGNATION', 'DEPARTMENT', 'ORGANIZATION'],
    required: true
  },
  salaryStructureId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'SalaryStructure'
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

salaryRevisionSchema.index({ organizationId: 1, targetId: 1, timestamp: -1 });

export const SalaryRevision = mongoose.model('SalaryRevision', salaryRevisionSchema);
export default SalaryRevision;
