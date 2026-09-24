import mongoose from 'mongoose';

const JobSequenceSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  sequenceValue: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'jobsequences'
});

// One sequence counter per organization
JobSequenceSchema.index({ organizationId: 1 }, { unique: true });

export default mongoose.model('JobSequence', JobSequenceSchema);
