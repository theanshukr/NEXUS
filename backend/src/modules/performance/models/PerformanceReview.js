import mongoose from 'mongoose';

const PerformanceReviewSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cycleName: { type: String, required: true },
  status: { type: String, enum: ['Ready for Calibration', 'Needs Manager Review', 'Completed'], default: 'Needs Manager Review' },
  overallScore: { type: Number, min: 1, max: 5 },
  feedback: { type: String }
}, { timestamps: true });

PerformanceReviewSchema.methods.toJSON = function() {
  const obj = this.toObject();
  return {
    id: obj._id,
    employeeId: obj.employeeId,
    reviewerId: obj.reviewerId,
    cycleName: obj.cycleName,
    status: obj.status,
    overallScore: obj.overallScore,
    feedback: obj.feedback
  };
};

export default mongoose.model('PerformanceReview', PerformanceReviewSchema);
