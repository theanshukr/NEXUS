import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const TicketSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true, enum: ['Hardware', 'Software', 'Access', 'Other'] },
  priority: { type: String, required: true, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
  status: { type: String, required: true, enum: ['OPEN', 'IN_PROGRESS', 'CLOSED'], default: 'OPEN' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  history: [MessageSchema]
}, { timestamps: true });

// Transform for frontend format
TicketSchema.methods.toJSON = function() {
  const obj = this.toObject();
  let requesterName = 'Unknown';
  if (obj.requestedBy && obj.requestedBy.firstName) {
    requesterName = `${obj.requestedBy.firstName} ${obj.requestedBy.lastName}`;
  }
  return {
    id: obj._id,
    subject: obj.subject,
    description: obj.description,
    category: obj.category,
    priority: obj.priority,
    status: obj.status,
    requester: requesterName,
    requestedById: obj.requestedBy ? (obj.requestedBy._id || obj.requestedBy) : null,
    assignedTo: obj.assignedTo,
    history: obj.history,
    created: obj.createdAt,
    updated: obj.updatedAt
  };
};

export default mongoose.model('Ticket', TicketSchema);
