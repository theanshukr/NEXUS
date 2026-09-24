import EventEmitter from 'node:events';
import logger from '#ai/platform/logger.js';

/**
 * EventBus — Singleton Node.js EventEmitter for decoupled AI platform events.
 *
 * Used for:
 *   - ai.audit          → Write AiAuditLog record after each conversation turn
 *   - ai.usage          → Update AiUsage cost ledger after each LLM call
 *   - ai.context.overflow → Trigger async ContextSummarizer when window overflows
 *   - document.uploaded → Trigger async RAG chunking + embedding pipeline
 *
 * In production clustering (multi-instance deployment), replace the Node EventEmitter
 * with a BullMQ-backed queue by setting QUEUE_DRIVER=bullmq in env.
 *
 * All handlers are fire-and-forget (async) — emitter never awaits handler completion.
 * Failed handlers log errors but do not crash the main request pipeline.
 */
class EventBusClass extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Prevent memory leak warnings with many listeners
    this._registeredEvents = new Set();
  }

  /**
   * Register an async event handler with automatic error capture.
   * @param {string} event
   * @param {Function} handler  async (payload) => void
   */
  on(event, handler) {
    const safeHandler = async (payload) => {
      try {
        await handler(payload);
      } catch (error) {
        logger.error({ err: error, event }, '[EventBus] Unhandled error in event listener');
      }
    };

    this._registeredEvents.add(event);
    super.on(event, safeHandler);
    return this;
  }

  /**
   * Emit an event with payload. Returns true if any listeners handled it.
   * @param {string} event
   * @param {*} payload
   */
  emit(event, payload) {
    logger.debug({ event, hasListeners: this.listenerCount(event) > 0 }, '[EventBus] Event emitted');
    return super.emit(event, payload);
  }

  /**
   * Returns all events that have been registered.
   */
  get registeredEvents() {
    return [...this._registeredEvents];
  }
}

export default new EventBusClass();
