import ProviderRouter from '#ai/providers/ProviderRouter.js';
import MongoAtlasAdapter from '#ai/search/adapters/MongoAtlasAdapter.js';
import DocumentChunker from '#ai/search/DocumentChunker.js';
import { DocumentChunk } from '#ai/models/DocumentChunk.js';
import cache from '#ai/platform/cache.js';
import logger from '#ai/platform/logger.js';
import crypto from 'node:crypto';

/**
 * SearchService — Pluggable semantic search abstraction for the RAG pipeline.
 *
 * Responsibilities:
 *   - Embed query text using ProviderRouter.generateEmbedding()
 *   - Execute tenant-isolated vector search via MongoAtlasAdapter
 *   - Return ranked document chunks as grounding context
 *   - Cache embedding vectors to avoid redundant API calls
 *
 * Also handles document ingestion:
 *   - Chunk document text via DocumentChunker
 *   - Generate embeddings for each chunk
 *   - Store chunks with vectors in DocumentChunk collection
 */
class SearchService {
  /**
   * Semantic vector search for a query within a tenant's knowledge base.
   *
   * @param {string}  query          Natural language query
   * @param {string}  organizationId Tenant scope — enforces isolation
   * @param {object}  options        { topK, category }
   * @returns {Promise<Array<{ textContent, documentTitle, documentCategory, chunkIndex, score }>>}
   */
  async semanticQuery(query, organizationId, options = {}) {
    const queryVector = await this._getOrGenerateEmbedding(query);
    return MongoAtlasAdapter.vectorSearch(queryVector, organizationId, options);
  }

  /**
   * Ingest a document into the RAG vector store.
   * Chunks the text, generates embeddings for each chunk, and stores them.
   *
   * @param {object} params
   * @param {string} params.rawText         Full extracted document text
   * @param {string} params.documentId      Backend document ID
   * @param {string} params.documentTitle   Document display title
   * @param {string} params.documentCategory
   * @param {string} params.organizationId
   * @param {string} params.sourceUrl       Optional document URL
   * @returns {Promise<{ chunksCreated: number }>}
   */
  async ingestDocument({ rawText, documentId, documentTitle, documentCategory, organizationId, sourceUrl }) {
    logger.info({ documentId, documentTitle, orgId: organizationId }, '[SearchService] Starting document ingestion');

    const chunks = DocumentChunker.chunk(rawText, { documentTitle, documentCategory });

    if (chunks.length === 0) {
      logger.warn({ documentId }, '[SearchService] No valid chunks extracted from document');
      return { chunksCreated: 0 };
    }

    // Delete existing chunks for this document (re-ingestion support)
    await DocumentChunk.deleteMany({ organizationId, documentId });

    const operations = [];

    for (const chunk of chunks) {
      const embedding = await this._getOrGenerateEmbedding(chunk.textContent);
      operations.push({
        organizationId,
        documentId,
        documentTitle,
        documentCategory: documentCategory || 'OTHER',
        sourceUrl,
        chunkIndex:      chunk.chunkIndex,
        textContent:     chunk.textContent,
        tokenCount:      chunk.tokenCount,
        pageNumber:      chunk.pageNumber,
        embeddingVector: embedding,
      });
    }

    await DocumentChunk.insertMany(operations);
    logger.info({ documentId, chunksCreated: operations.length }, '[SearchService] Document ingested successfully');

    return { chunksCreated: operations.length };
  }

  /**
   * Returns a cached embedding or generates and caches a new one.
   * Cache key: SHA-256 hash of the text content (7-day TTL).
   */
  async _getOrGenerateEmbedding(text) {
    const hash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
    const cacheKey = `ai:embed:cache:${hash}`;

    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const vector = await ProviderRouter.generateEmbedding(text);
    await cache.set(cacheKey, vector, 7 * 24 * 3600); // 7 days
    return vector;
  }
}

export default new SearchService();
