import mongoose from 'mongoose';

const RequisitionHistorySchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  requisitionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobRequisition',
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: ['CREATED', 'SUBMITTED', 'APPROVED', 'PUBLISHED', 'CLOSED', 'ARCHIVED', 'EDITED', 'REJECTED'],
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  comment: {
    type: String,
    default: ''
  }
}, {
  timestamps: true, // we still keep timestamps for system record, though timestamp is the business date
  collection: 'requisitionhistory'
});

// Enforce immutability
RequisitionHistorySchema.statics.preventMutation = function() {
  throw new Error('RequisitionHistory records are immutable and cannot be modified or deleted.');
};

RequisitionHistorySchema.pre('findOneAndUpdate', function() { this.model.preventMutation(); });
RequisitionHistorySchema.pre('updateOne', function() { this.model.preventMutation(); });
RequisitionHistorySchema.pre('updateMany', function() { this.model.preventMutation(); });
RequisitionHistorySchema.pre('findOneAndDelete', function() { this.model.preventMutation(); });
RequisitionHistorySchema.pre('deleteOne', function() { this.model.preventMutation(); });
RequisitionHistorySchema.pre('deleteMany', function() { this.model.preventMutation(); });
RequisitionHistorySchema.pre('save', function() {
  if (!this.isNew) {
    throw new Error('RequisitionHistory records are immutable and cannot be modified after creation.');
  }
});

export default mongoose.model('RequisitionHistory', RequisitionHistorySchema);
