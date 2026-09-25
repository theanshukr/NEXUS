import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['PLANNING', 'ACTIVE', 'COMPLETED', 'ON_HOLD'], default: 'PLANNING' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dueDate: { type: Date },
  progress: { type: Number, default: 0 },
  requiredSkillIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Skill' 
  }],
  team: [{
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    role: { type: String, trim: true, default: 'Member' }
  }]
}, { timestamps: true });

ProjectSchema.methods.toJSON = function() {
  const obj = this.toObject();
  return {
    id: obj._id,
    name: obj.name,
    description: obj.description,
    status: obj.status,
    owner: obj.owner,
    dueDate: obj.dueDate,
    progress: obj.progress,
    requiredSkillIds: obj.requiredSkillIds,
    team: obj.team,
    created: obj.createdAt,
    updated: obj.updatedAt
  };
};

ProjectSchema.pre('save', async function() {
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
  
  if (this.isModified('team') && this.team && this.team.length > 0) {
     // Optional: Prevent duplicate team members
     const employeeIds = this.team.map(m => m.employeeId.toString());
     if (new Set(employeeIds).size !== employeeIds.length) {
         throw new Error('Duplicate employeeId found in project team.');
     }
  }
});

export default mongoose.model('Project', ProjectSchema);
