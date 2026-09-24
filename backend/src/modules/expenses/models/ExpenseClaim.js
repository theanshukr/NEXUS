import mongoose from 'mongoose';

const ExpenseClaimSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  category: { type: String, enum: ['Travel', 'Meals', 'Office Supplies', 'Internet', 'Other'], default: 'Other' },
  description: { type: String, required: true },
  receiptUrl: { type: String },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Paid'], default: 'Pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

ExpenseClaimSchema.methods.toJSON = function() {
  const obj = this.toObject();
  return {
    id: obj._id,
    employeeId: obj.employeeId,
    amount: obj.amount,
    category: obj.category,
    description: obj.description,
    receiptUrl: obj.receiptUrl,
    status: obj.status,
    approvedBy: obj.approvedBy,
    date: obj.createdAt
  };
};

export default mongoose.model('ExpenseClaim', ExpenseClaimSchema);
