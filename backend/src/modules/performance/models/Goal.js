import mongoose from 'mongoose';

const GoalSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: Date },
  status: { type: String, enum: ['On Track', 'At Risk', 'Completed'], default: 'On Track' },
  progressPercentage: { type: Number, default: 0 },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

GoalSchema.methods.toJSON = function() {
  const obj = this.toObject();
  return {
    id: obj._id,
    title: obj.title,
    description: obj.description,
    dueDate: obj.dueDate,
    status: obj.status,
    progressPercentage: obj.progressPercentage,
    employeeId: obj.employeeId
  };
};

export default mongoose.model('Goal', GoalSchema);
