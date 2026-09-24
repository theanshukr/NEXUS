import logger from '#@/platform/logger/index.js';
import { runInTransaction } from '#@/platform/database/db.js';
import EventBus from '#@/core/events/EventBus.js';
import EVENTS from '#@/core/constants/events/index.js';

/**
 * OrganizationBootstrapRegistry
 * Centralized registry for multi-tenant bootstrap handlers.
 * Allows decoupled domain modules (e.g., departments, shifts, locations) to register seeding logic
 * executed automatically upon new tenant provisioning without modifying M-01 OrganizationService.
 */
class OrganizationBootstrapRegistryService {
  constructor() {
    this.handlers = [];
    this._isInitialized = false;
  }

  /**
   * Initializes the registry by subscribing to the TENANT_PROVISIONED domain event.
   * Ensures idempotency against multiple initialization calls.
   */
  init() {
    if (this._isInitialized) {
      return;
    }
    EventBus.on(EVENTS.TENANT.PROVISIONED, async (payload) => {
      await this.executeAll(payload);
    });
    this._isInitialized = true;
    logger.info('OrganizationBootstrapRegistry initialized and subscribed to TENANT_PROVISIONED');
  }

  /**
   * Registers a bootstrap handler from a domain module.
   * @param {string} name - Unique human-readable name of the handler (e.g., 'DepartmentBootstrap')
   * @param {Function} handlerFn - Async function (payload, { session }) => Promise<void>
   * @param {number} [priority=10] - Execution order priority (lower runs first, default: 10)
   */
  register(name, handlerFn, priority = 10) {
    if (typeof handlerFn !== 'function') {
      throw new TypeError(`Bootstrap handler [${name}] must be a function.`);
    }

    // Replace if handler with same name already registered (supports hot reloading / idempotency)
    const existingIndex = this.handlers.findIndex(h => h.name === name);
    if (existingIndex !== -1) {
      this.handlers[existingIndex] = { name, handlerFn, priority };
      logger.debug({ name, priority }, 'Re-registered bootstrap handler');
    } else {
      this.handlers.push({ name, handlerFn, priority });
      logger.debug({ name, priority }, 'Registered new bootstrap handler');
    }

    // Always sort deterministically: first by priority ascending, then alphabetically by name
    this.handlers.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Executes all registered bootstrap handlers sequentially for a provisioned tenant.
   * Each handler is executed inside an ACID transaction (or uses provided session).
   * Failures are caught and logged so subsequent handlers can proceed or be diagnosed.
   * @param {Object} payload - { organizationId, adminUserId }
   * @param {Object} [options={}] - Optional execution options (e.g., { session })
   */
  async executeAll(payload, options = {}) {
    const { organizationId } = payload;
    if (!organizationId) {
      logger.error('OrganizationBootstrapRegistry executed without organizationId in payload');
      return;
    }

    logger.info({ organizationId, handlerCount: this.handlers.length }, 'Starting sequential execution of bootstrap handlers for tenant');

    for (const { name, handlerFn } of this.handlers) {
      try {
        if (options.session) {
          await handlerFn(payload, { session: options.session });
        } else {
          // Execute handler inside an independent Mongoose ACID transaction
          await runInTransaction(async (session) => {
            await handlerFn(payload, { session });
          });
        }
        logger.info({ organizationId, handlerName: name }, 'Successfully executed bootstrap handler');
      } catch (error) {
        logger.error(
          { err: error.message, stack: error.stack, organizationId, handlerName: name },
          'Error executing organization bootstrap handler'
        );
      }
    }

    logger.info({ organizationId }, 'Completed execution of OrganizationBootstrapRegistry handlers');
  }

  /**
   * Clears all registered handlers (useful for unit testing).
   */
  clear() {
    this.handlers = [];
  }

  /**
   * Returns a copy of registered handlers.
   */
  getHandlers() {
    return [...this.handlers];
  }
}

export const OrganizationBootstrapRegistry = new OrganizationBootstrapRegistryService();
// Auto-initialize subscription upon module import
OrganizationBootstrapRegistry.init();

export default OrganizationBootstrapRegistry;
