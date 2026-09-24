import mongoose from 'mongoose';

const { Schema, Types: { ObjectId } } = mongoose;

/**
 * DocumentChunk — RAG vector store for tenant knowledge base documents.
 *
 * Each document is split into overlapping text chunks (500 tokens, 50 token overlap)
 * and each chunk is stored with its 1536-dimensional embedding vector.
 *
 * MongoDB Atlas Vector Search index must be created on the `embeddingVector` field:
 *   Index name: nexusops_vector_index
 *   Type: vectorSearch
 *   Field: embeddingVector
 *   Dimensions: 1536
 *   Similarity: cosine
 *
 * Tenant isolation: all queries MUST include { organizationId } filter.
 */
const documentChunkSchema = new Schema({
  organizationId:  { type: ObjectId, required: true, index: true },
  documentId:      { type: ObjectId, required: true, index: true },

  // Document metadata (denormalized for query performance)
  documentTitle:   { type: String, required: true },
  documentCategory:{ type: String, enum: ['HR', 'FINANCE', 'IT', 'LEGAL', 'OPERATIONS', 'OTHER'], default: 'OTHER' },
  sourceUrl:       { type: String },

  // Chunk data
  chunkIndex:      { type: Number, required: true },
  textContent:     { type: String, required: true },
  tokenCount:      { type: Number },
  pageNumber:      { type: Number },

  // Vector embedding (1536-dim for text-embedding-004)
  embeddingVector: { type: [Number], required: true },

  // Access control scoping (role-based document visibility)
  accessRoleScope: { type: [String], default: ['ALL_EMPLOYEES'] },

}, {
  timestamps: true,
  collection: 'document_chunks',
});

// Tenant + document compound index for fast chunk retrieval
documentChunkSchema.index({ organizationId: 1, documentId: 1, chunkIndex: 1 });
// Category filter index
documentChunkSchema.index({ organizationId: 1, documentCategory: 1 });

export const DocumentChunk = mongoose.model('DocumentChunk', documentChunkSchema);
export default DocumentChunk;
