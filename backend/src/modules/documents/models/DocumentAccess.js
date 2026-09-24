import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

export const PRINCIPAL_TYPES = ['USER', 'ROLE', 'DEPARTMENT', 'TEAM', 'ORGANIZATION'];
export const ACCESS_LEVELS = ['READ', 'WRITE', 'DELETE', 'SHARE', 'OWNER'];

const documentAccessSchema = new Schema(
  {
    documentId: {
      type: Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true
    },
    principalType: {
      type: String,
      enum: Object.values(PRINCIPAL_TYPES),
      required: true
    },
    principalId: {
      type: Types.ObjectId,
      required: true
    },
    accessLevel: {
      type: String,
      enum: Object.values(ACCESS_LEVELS),
      required: true
    },
    grantedBy: {
      type: Types.ObjectId,
      required: true
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Compound index for querying permissions efficiently
documentAccessSchema.index({ documentId: 1, principalType: 1, principalId: 1 }, { unique: true });

export const DocumentAccess = mongoose.model('DocumentAccess', documentAccessSchema);
export default DocumentAccess;
