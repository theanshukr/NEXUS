import mongoose from 'mongoose';

const AssetSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['Laptop', 'Monitor', 'Mobile', 'Other'], default: 'Laptop' },
  serialNumber: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Available', 'Assigned', 'In Repair', 'Retired'], default: 'Available' },
  purchaseDate: { type: Date }
}, { timestamps: true });

AssetSchema.methods.toJSON = function() {
  const obj = this.toObject();
  let assignedUser = 'Unassigned';
  if (obj.assignedTo && obj.assignedTo.firstName) {
    assignedUser = `${obj.assignedTo.firstName} ${obj.assignedTo.lastName}`;
  }
  return {
    id: obj._id,
    name: obj.name,
    type: obj.type,
    serialNumber: obj.serialNumber,
    status: obj.status,
    assignedTo: assignedUser,
    assignedToId: obj.assignedTo ? (obj.assignedTo._id || obj.assignedTo) : null
  };
};

export default mongoose.model('Asset', AssetSchema);
