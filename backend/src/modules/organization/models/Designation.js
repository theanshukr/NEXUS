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
  requiredSkillIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Skill' 
  }],
  defaultDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
  archivedAt: { type: Date, default: null },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  archiveReason: { type: String, trim: true, default: null }
}, { timestamps: true });

designationSchema.index({ organizationId: 1, code: 1 }, { unique: true });
designationSchema.index({ organizationId: 1, status: 1 });

designationSchema.pre('save', async function() {
  if (this.isModified('requiredSkillIds') && this.requiredSkillIds && this.requiredSkillIds.length > 0) {
    // Prevent duplicate skill references
    this.requiredSkillIds = [...new Set(this.requiredSkillIds.map(id => id.toString()))];
    
    // Enforce multi-tenancy: skills must belong to the same organization
    const skills = await mongoose.model('Skill').find({ _id: { $in: this.requiredSkillIds } }, 'organizationId');
    if (skills.length !== this.requiredSkillIds.length) {
      throw new Error('One or more requiredSkillIds are invalid or do not exist.');
    }
    for (const skill of skills) {
      if (skill.organizationId.toString() !== this.organizationId.toString()) {
        throw new Error(`Skill ${skill._id} belongs to a different organization and cannot be referenced.`);
      }
    }
  }
});

export const Designation = mongoose.model('Designation', designationSchema);
export default Designation;
