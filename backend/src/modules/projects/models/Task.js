import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }, // Can be null if it's a standalone task
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['TO_DO', 'IN_PROGRESS', 'REVIEW', 'DONE'], default: 'TO_DO' },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
  deadline: { type: String }, // Storing as string for simplicity e.g. 'Oct 15' or ISO
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

TaskSchema.methods.toJSON = function() {
  const obj = this.toObject();
  return {
    id: obj._id,
    title: obj.title,
    description: obj.description,
    status: obj.status,
    priority: obj.priority,
    deadline: obj.deadline,
    project: obj.projectId && obj.projectId.name ? obj.projectId.name : 'General',
    projectId: obj.projectId ? (obj.projectId._id || obj.projectId) : null,
    assignee: obj.assignee,
    created: obj.createdAt,
    updated: obj.updatedAt
  };
};

export default mongoose.model('Task', TaskSchema);
