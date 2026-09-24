import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  priority: { 
    type: String, 
    enum: ['info', 'success', 'warning', 'critical'],
    default: 'info'
  },
  channel: {
    type: String,
    enum: ['in-app', 'email', 'sms'],
    default: 'in-app'
  },
  targetRoles: [{ type: String }],
  targetUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tenantId: { type: String, required: true }
}, {
  timestamps: true
});

// Index for efficient querying by tenant and role/user
notificationSchema.index({ tenantId: 1, targetRoles: 1 });
notificationSchema.index({ tenantId: 1, targetUserIds: 1 });
notificationSchema.index({ createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
