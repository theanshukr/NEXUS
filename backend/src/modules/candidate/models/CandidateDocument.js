import mongoose from 'mongoose';

const candidateDocumentSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true,
    index: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['RESUME', 'COVER_LETTER', 'PORTFOLIO', 'CERTIFICATE'],
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export const CandidateDocument = mongoose.model('CandidateDocument', candidateDocumentSchema);
export default CandidateDocument;
