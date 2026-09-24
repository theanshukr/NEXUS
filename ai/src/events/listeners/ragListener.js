import EventBus from '#ai/events/EventBus.js';
import SearchService from '#ai/search/SearchService.js';
import logger from '#ai/platform/logger.js';

/**
 * ragListener — Handles document.uploaded events to trigger the async RAG ingestion pipeline.
 *
 * Event payload:
 *   { documentId, documentTitle, documentCategory, rawText, organizationId, sourceUrl? }
 */
EventBus.on('document.uploaded', async (payload) => {
  const { documentId, documentTitle, documentCategory, rawText, organizationId, sourceUrl } = payload;

  logger.info({ documentId, documentTitle, orgId: organizationId }, '[ragListener] Starting RAG ingestion pipeline');

  try {
    const { chunksCreated } = await SearchService.ingestDocument({
      rawText,
      documentId,
      documentTitle,
      documentCategory,
      organizationId,
      sourceUrl,
    });

    logger.info({ documentId, chunksCreated }, '[ragListener] RAG ingestion complete');
  } catch (error) {
    logger.error({ err: error, documentId }, '[ragListener] RAG ingestion failed');
  }
});

export default {};
