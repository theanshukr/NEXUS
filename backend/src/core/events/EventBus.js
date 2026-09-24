import { EventEmitter } from 'events';
import logger from '#@/platform/logger/index.js';
import TransactionContext from '#@/core/context/TransactionContext.js';

/**
 * In-Memory Domain Event Bus
 * Built on Node.js native EventEmitter without external dependencies.
 * Wraps ALL listener attachment methods in try/catch blocks so background asynchronous failures never crash the main thread.
 * Provides structured logging for domain event publishing and consumption.
 */
class EventBusService extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  /**
   * Internal helper to wrap listener execution in an async-safe try/catch block.
   * Prevents unhandled promise rejections across all listener attachment methods.
   * @param {string} eventName 
   * @param {Function} listener 
   * @returns {Function}
   */
  _wrapListener(eventName, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('EventBus listener must be a function.');
    }
    // Prevent double-wrapping if already wrapped
    if (listener._originalListener) {
      return listener;
    }

    const safeListener = async (...args) => {
      try {
        await Promise.resolve(listener(...args));
      } catch (err) {
        logger.error(
          { err: err.message, stack: err.stack, eventName, args },
          'Uncaught exception in EventBus listener execution'
        );
      }
    };

    safeListener._originalListener = listener;
    return safeListener;
  }

  on(eventName, listener) {
    return super.on(eventName, this._wrapListener(eventName, listener));
  }

  addListener(eventName, listener) {
    return super.addListener(eventName, this._wrapListener(eventName, listener));
  }

  once(eventName, listener) {
    return super.once(eventName, this._wrapListener(eventName, listener));
  }

  prependListener(eventName, listener) {
    return super.prependListener(eventName, this._wrapListener(eventName, listener));
  }

  prependOnceListener(eventName, listener) {
    return super.prependOnceListener(eventName, this._wrapListener(eventName, listener));
  }

  /**
   * Subscribe alias for clean domain terminology.
   * @param {string} eventName 
   * @param {Function} listener 
   * @returns {Function} Unsubscribe callback
   */
  subscribe(eventName, listener) {
    this.on(eventName, listener);
    return () => this.off(eventName, listener);
  }

  /**
   * Overrides off/removeListener to support matching against _originalListener.
   * @param {string} eventName 
   * @param {Function} listener 
   * @returns {this}
   */
  off(eventName, listener) {
    const listeners = this.listeners(eventName);
    for (const l of listeners) {
      if (l === listener || l._originalListener === listener) {
        super.off(eventName, l);
        break;
      }
    }
    return this;
  }

  removeListener(eventName, listener) {
    return this.off(eventName, listener);
  }

  /**
   * Emits a domain event with structured logging.
   * @param {string} eventName 
   * @param {Object} [payload={}] 
   * @returns {boolean}
   */
  emit(eventName, payload = {}, options = {}) {
    if (!options.skipQueue) {
      const txContext = TransactionContext.getStore();
      if (txContext && txContext.queuedEvents) {
        logger.debug({ eventName }, 'Deferring domain event until transaction commit');
        txContext.queuedEvents.push({ eventName, payload });
        return true; // Assume it will be handled
      }
    }

    logger.debug({ eventName, payload }, 'Emitting domain event via EventBus');
    return super.emit(eventName, payload);
  }
}

export const EventBus = new EventBusService();
export default EventBus;
