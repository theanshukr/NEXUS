import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['PLANNING', 'ACTIVE', 'COMPLETED', 'ON_HOLD'], default: 'PLANNING' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dueDate: { type: Date },
  progress: { type: Number, default: 0 }
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
    created: obj.createdAt,
    updated: obj.updatedAt
  };
};

export default mongoose.model('Project', ProjectSchema);
