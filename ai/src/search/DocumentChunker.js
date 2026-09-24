/**
 * DocumentChunker — Splits raw document text into overlapping token windows.
 *
 * Strategy: Sentence-aware sliding window
 *   - Target chunk size: RAG_CHUNK_SIZE tokens (default 500)
 *   - Overlap: RAG_CHUNK_OVERLAP tokens (default 50)
 *   - Split points: Sentence boundaries (. ! ?) then paragraph boundaries (\n\n)
 *   - Minimum chunk size: 50 tokens (discard smaller chunks)
 *
 * Token estimation uses a simple word-count heuristic (1 token ≈ 0.75 words for English).
 * In production, replace with tiktoken for accurate counts.
 */
import env from '#ai/config/env.js';
import logger from '#ai/platform/logger.js';

// Token estimation: ~1.33 words per token for English text
const estimateTokens = (text) => Math.ceil(text.split(/\s+/).length / 0.75);

class DocumentChunker {
  constructor() {
    this._chunkSize    = env.RAG_CHUNK_SIZE;
    this._overlapSize  = env.RAG_CHUNK_OVERLAP;
    this._minChunkSize = 50;
  }

  /**
   * Split a raw text string into overlapping chunks.
   *
   * @param {string} rawText     Full document text
   * @param {object} metadata    { documentTitle, documentCategory, pageNumber? }
   * @returns {Array<{ chunkIndex, textContent, tokenCount, pageNumber? }>}
   */
  chunk(rawText, metadata = {}) {
    if (!rawText || typeof rawText !== 'string') {
      return [];
    }

    // Split into sentences using basic sentence boundaries
    const sentences = this._splitIntoSentences(rawText);
    const chunks = [];
    let currentChunk = [];
    let currentTokens = 0;
    let chunkIndex = 0;

    for (const sentence of sentences) {
      const sentenceTokens = estimateTokens(sentence);

      // If adding this sentence would exceed chunk size, flush current chunk
      if (currentTokens + sentenceTokens > this._chunkSize && currentChunk.length > 0) {
        const chunkText = currentChunk.join(' ').trim();
        if (estimateTokens(chunkText) >= this._minChunkSize) {
          chunks.push({
            chunkIndex: chunkIndex++,
            textContent: chunkText,
            tokenCount: currentTokens,
            pageNumber: metadata.pageNumber,
          });
        }

        // Carry over overlap: take the last N tokens worth of sentences
        const overlapSentences = this._getOverlapSentences(currentChunk, this._overlapSize);
        currentChunk = [...overlapSentences, sentence];
        currentTokens = overlapSentences.reduce((sum, s) => sum + estimateTokens(s), 0) + sentenceTokens;
      } else {
        currentChunk.push(sentence);
        currentTokens += sentenceTokens;
      }
    }

    // Flush the last chunk
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ').trim();
      if (estimateTokens(chunkText) >= this._minChunkSize) {
        chunks.push({
          chunkIndex: chunkIndex++,
          textContent: chunkText,
          tokenCount: currentTokens,
          pageNumber: metadata.pageNumber,
        });
      }
    }

    logger.debug({ documentTitle: metadata.documentTitle, chunks: chunks.length, totalTokens: estimateTokens(rawText) },
      '[DocumentChunker] Document chunked');

    return chunks;
  }

  /**
   * Splits text into sentence-level segments.
   * Falls back to paragraph splitting for very long sentences.
   */
  _splitIntoSentences(text) {
    // Split on sentence-ending punctuation followed by whitespace + capital letter
    const sentences = text
      .replace(/([.!?])\s+(?=[A-Z])/g, '$1\n')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    return sentences;
  }

  /**
   * Returns the last N tokens worth of sentences for overlap.
   */
  _getOverlapSentences(sentences, targetOverlapTokens) {
    const result = [];
    let tokenCount = 0;
    for (let i = sentences.length - 1; i >= 0; i--) {
      const t = estimateTokens(sentences[i]);
      if (tokenCount + t > targetOverlapTokens) break;
      result.unshift(sentences[i]);
      tokenCount += t;
    }
    return result;
  }
}

export default new DocumentChunker();
