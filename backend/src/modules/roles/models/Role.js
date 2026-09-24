import mongoose from 'mongoose';

/**
 * Role Schema (Tenant Scoped & Dynamic with Embedded Permission Strings)
 * Embedding permission strings directly inside the Role document reduces query complexity,
 * eliminates many-to-many join collections for permissions, and fits MongoDB document modeling best practices.
 */
const roleSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  priority: { type: Number, required: true, default: 50 }, // 0 = Highest (Super Admin), 100 = Lowest (Standard Employee)
  permissions: [{ type: String, required: true }],          // Embedded array of atomic permission strings (e.g., 'user.create')
  isSystemTemplate: { type: Boolean, default: false },     // True for baseline templates (HR, Finance, etc.)
  status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' }
}, { timestamps: true });

roleSchema.index({ organizationId: 1, name: 1 }, { unique: true });
roleSchema.index({ organizationId: 1, priority: 1 });
roleSchema.index({ organizationId: 1, status: 1 });

export const Role = mongoose.model('Role', roleSchema);
export default Role;
