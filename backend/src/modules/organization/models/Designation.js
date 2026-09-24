import mongoose from 'mongoose';

const designationSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  salaryGrade: { type: String, trim: true, default: '' },
  payBand: {
    min: { type: Number, min: 0, default: 0 },
    max: { type: Number, min: 0, default: 0 }
  },
  defaultDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
  archivedAt: { type: Date, default: null },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  archiveReason: { type: String, trim: true, default: null }
}, { timestamps: true });

designationSchema.index({ organizationId: 1, code: 1 }, { unique: true });
designationSchema.index({ organizationId: 1, status: 1 });

export const Designation = mongoose.model('Designation', designationSchema);
export default Designation;
