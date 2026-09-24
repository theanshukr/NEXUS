import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  startTime: { type: String, required: true, trim: true }, // Format HH:mm
  endTime: { type: String, required: true, trim: true }, // Format HH:mm
  gracePeriodMinutes: { type: Number, min: 0, default: 15 },
  isNightShift: { type: Boolean, default: false },
  status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
  archivedAt: { type: Date, default: null },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  archiveReason: { type: String, trim: true, default: null }
}, { timestamps: true });

shiftSchema.index({ organizationId: 1, code: 1 }, { unique: true });
shiftSchema.index({ organizationId: 1, status: 1 });

export const Shift = mongoose.model('Shift', shiftSchema);
export default Shift;
