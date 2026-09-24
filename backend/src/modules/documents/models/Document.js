import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

export const OWNER_TYPES = ['EMPLOYEE', 'CANDIDATE', 'ORGANIZATION', 'DEPARTMENT', 'TEAM', 'SYSTEM'];

export const DOCUMENT_CATEGORIES = [
  'candidate-resume',
  'candidate-cover-letter',
  'employee-profile-photo',
  'employee-contract',
  'employee-payslip',
  'employee-medical',
  'offer-letter',
  'performance-review',
  'company-policy',
  'training-material',
  'asset-document',
  'helpdesk-attachment',
  'generic'
];

export const DOCUMENT_STATUSES = ['ACTIVE', 'ARCHIVED', 'DELETED'];

const documentSchema = new Schema(
  {
    organizationId: {
      type: Types.ObjectId,
      required: true,
      index: true
    },
    storageProvider: {
      type: String,
      required: true
    },
    bucket: {
      type: String,
      required: true
    },
    storagePath: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    originalFilename: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    extension: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    checksum: {
      type: String,
      default: null
    },
    category: {
      type: String,
      enum: Object.values(DOCUMENT_CATEGORIES),
      required: true,
      index: true
    },
    ownerType: {
      type: String,
      enum: Object.values(OWNER_TYPES),
      required: true
    },
    ownerId: {
      type: Types.ObjectId,
      required: true
    },
    uploadedBy: {
      type: Types.ObjectId,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      enum: Object.values(DOCUMENT_STATUSES),
      default: 'ACTIVE',
      index: true
    },
    version: {
      type: Number,
      default: 1
    }
  },
  { timestamps: true }
);

// Compound index for finding documents by owner
documentSchema.index({ ownerType: 1, ownerId: 1 });

// Safety mechanism to prevent mutating audit trails (similar to AuditLog patterns, but Document isn't fully immutable, though storagePath should be immutable)
documentSchema.pre('findOneAndUpdate', function (next) {
  // We can add validations here if needed, but for now we just rely on Zod layer.
  next();
});

export const Document = mongoose.model('Document', documentSchema);
export default Document;
