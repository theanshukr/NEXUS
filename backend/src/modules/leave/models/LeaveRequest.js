import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  leavePolicyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeavePolicy',
    required: true
  },
  leavePolicyVersion: {
    type: Number,
    required: true
  },
  policySnapshot: {
    type: mongoose.Schema.Types.Mixed,
    required: true // Immutable copy of the rules applied at request time
  },
  leaveCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true
  },
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true,
    index: true
  },
  totalDays: {
    type: Number,
    required: true
  },
  isHalfDay: {
    type: Boolean,
    default: false
  },
  halfDayPeriod: {
    type: String,
    enum: ['MORNING', 'AFTERNOON', null],
    default: null
  },
  reason: {
    type: String,
    required: true
  },
  attachmentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },
  currentApproverRole: {
    type: String, // e.g. 'MANAGER', 'HR_MANAGER'
    required: true
  },
  escalatedToHr: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  }
}, { timestamps: true });

leaveRequestSchema.index({ organizationId: 1, employeeId: 1, status: 1 });
leaveRequestSchema.index({ organizationId: 1, startDate: 1, endDate: 1 });

export default mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', leaveRequestSchema);
