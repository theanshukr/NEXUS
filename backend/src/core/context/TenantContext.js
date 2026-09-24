import { AsyncLocalStorage } from 'async_hooks';

const als = new AsyncLocalStorage();

/**
 * TenantContext
 * Provides AsyncLocalStorage (ALS) storage for tenant request scoping as a safety net.
 * NOTE: Services and Repositories must still accept `organizationId` explicitly as a parameter.
 * ALS is used by BaseRepository strictly to validate that explicitly passed organizationId matches the request context,
 * preventing cross-tenant leakage in web requests while allowing background jobs (without ALS context) to execute safely.
 */
export const TenantContext = {
  /**
   * Runs a callback within a scoped tenant context.
   * @param {Object} store - { organizationId, userId, ... }
   * @param {Function} callback - Function to execute inside context
   */
  run(store, callback) {
    return als.run(store, callback);
  },

  /**
   * Retrieves the current store from ALS.
   * @returns {Object|undefined}
   */
  getStore() {
    return als.getStore();
  },

  /**
   * Gets the active organizationId from ALS context if inside a web request lifecycle.
   * @returns {string|null}
   */
  getOrganizationId() {
    const store = als.getStore();
    return store?.organizationId || null;
  }
};

export default TenantContext;
