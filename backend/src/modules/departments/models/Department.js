import mongoose from 'mongoose';

const ancestorSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  level: { type: Number, required: true }
}, { _id: false });

const departmentSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  parentDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  ancestors: { type: [ancestorSchema], default: [] },
  level: { type: Number, required: true, min: 0, default: 0 },
  managerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  cachedEmployeeCount: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
  archivedAt: { type: Date, default: null },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  archiveReason: { type: String, trim: true, default: null }
}, { timestamps: true });

departmentSchema.index({ organizationId: 1, code: 1 }, { unique: true });
departmentSchema.index({ organizationId: 1, parentDepartmentId: 1 });
departmentSchema.index({ organizationId: 1, 'ancestors._id': 1 });
departmentSchema.index({ organizationId: 1, status: 1 });
departmentSchema.index({ organizationId: 1, level: 1 });

export const Department = mongoose.model('Department', departmentSchema);
export default Department;
