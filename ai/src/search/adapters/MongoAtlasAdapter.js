import mongoose from 'mongoose';
import env from '#ai/config/env.js';
import logger from '#ai/platform/logger.js';

/**
 * MongoAtlasAdapter — Performs $vectorSearch queries against MongoDB Atlas.
 *
 * Requires a Vector Search index named `nexusops_vector_index` on the
 * `document_chunks` collection with:
 *   { "fields": [{ "type": "vector", "path": "embeddingVector", "numDimensions": 1536, "similarity": "cosine" }] }
 *
 * Tenant isolation is enforced via the `filter` field in $vectorSearch
 * which pre-filters candidates to the requesting organization before
 * vector distance computation.
 */
class MongoAtlasAdapter {
  /**
   * Execute a vector similarity search with mandatory tenant isolation.
   *
   * @param {number[]} queryVector       1536-dim query embedding
   * @param {string}   organizationId   ObjectId string — REQUIRED for tenant isolation
   * @param {object}   options
   * @param {number}   options.topK      Number of results to return (default 5)
   * @param {number}   options.numCandidates  ANN candidates scanned (default 150)
   * @param {string}   options.category  Optional document category filter
   * @returns {Promise<Array<{ textContent, documentTitle, documentCategory, chunkIndex, score }>>}
   */
  async vectorSearch(queryVector, organizationId, options = {}) {
    const { topK = env.RAG_TOP_K, numCandidates = 150, category } = options;

    if (!organizationId) {
      throw new Error('[MongoAtlasAdapter] FATAL: organizationId is required for vector search to enforce tenant isolation.');
    }

    // Build the pre-filter for tenant isolation + optional category filter
    const preFilter = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
      ...(category && category !== 'ALL' && { documentCategory: category }),
    };

    const pipeline = [
      {
        $vectorSearch: {
          index: env.MONGODB_VECTOR_INDEX,
          path: 'embeddingVector',
          queryVector,
          numCandidates,
          limit: topK,
          filter: preFilter,
        },
      },
      {
        $project: {
          _id: 0,
          textContent: 1,
          documentTitle: 1,
          documentCategory: 1,
          chunkIndex: 1,
          pageNumber: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    const db = mongoose.connection.db;
    const collection = db.collection('document_chunks');
    const results = await collection.aggregate(pipeline).toArray();

    logger.debug({ orgId: organizationId, topK, results: results.length }, '[MongoAtlasAdapter] Vector search complete');
    return results;
  }
}

export default new MongoAtlasAdapter();
