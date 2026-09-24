import { TenantIsolationError } from '#@/core/errors/AppError.js';
import logger from '#@/platform/logger/index.js';
import TenantContext from '#@/core/context/TenantContext.js';

/**
 * Abstract BaseRepository
 * Enforces zero-trust multi-tenancy by automatically injecting `{ organizationId }` into all read and write queries.
 * Validates against AsyncLocalStorage TenantContext (if active) to prevent cross-tenant data leakage while permitting background jobs.
 * Supports Mongoose ClientSession transactions via optional `options = { session }` argument across all methods.
 * Services must never invoke raw Mongoose models directly; they must call repository methods.
 */
export class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  /**
   * Validates explicit tenant scoping against ALS safety net.
   * @param {string} organizationId 
   */
  _validateTenantScope(organizationId) {
    if (!organizationId) {
      logger.error({ model: this.model.modelName }, 'Fatal security violation: Operation attempted without organizationId scope');
      throw new TenantIsolationError(`Fatal: Attempted to query or mutate [${this.model.modelName}] without organizationId scope.`);
    }

    // ALS Safety Net: If inside an active web request context, verify explicit parameter matches ALS store
    const contextOrgId = TenantContext.getOrganizationId();
    if (contextOrgId && String(contextOrgId) !== String(organizationId)) {
      logger.error({
        model: this.model.modelName,
        explicitOrgId: organizationId,
        contextOrgId
      }, 'Fatal security violation: Explicit organizationId does not match active AsyncLocalStorage tenant context');
      
      const trace = new Error().stack;
      
      throw new TenantIsolationError(
        `Fatal cross-tenant data leakage violation: Explicit organizationId [${organizationId}] does not match active tenant context [${contextOrgId}]. Trace: ${trace}`
      );
    }
  }

  /**
   * Generates a tenant-scoped query filter. Throws a fatal security exception if organizationId is missing or mismatched.
   * @param {Object} filter 
   * @param {string} organizationId 
   * @returns {Object} Scoped query filter
   */
  _scopeFilter(filter = {}, organizationId) {
    this._validateTenantScope(organizationId);
    return { ...filter, organizationId };
  }

  async findByIdAndTenant(id, organizationId, options = {}) {
    return await this.model.findOne(this._scopeFilter({ _id: id }, organizationId)).session(options.session || null);
  }

  async findOne(filter = {}, organizationId, options = {}) {
    return await this.model.findOne(this._scopeFilter(filter, organizationId)).session(options.session || null);
  }

  async find(filter = {}, organizationId, options = {}) {
    return await this.model.find(this._scopeFilter(filter, organizationId), null, options).session(options.session || null);
  }

  /**
   * Standardized pagination query helper for tenant-scoped collections.
   * @param {Object} params - { filter, page = 1, limit = 20, sort = { createdAt: -1 }, select = null, populate = null }
   * @param {string} organizationId - Tenant ID
   * @param {Object} [options] - Mongoose query options (e.g., { session })
   * @returns {Promise<Object>} Formatted pagination result `{ data, pagination: { total, page, limit, totalPages } }`
   */
  async findPaginated({ filter = {}, page = 1, limit = 20, sort = { createdAt: -1 }, select = null, populate = null }, organizationId, options = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const scopedFilter = this._scopeFilter(filter, organizationId);
    const session = options.session || null;

    let query = this.model.find(scopedFilter).sort(sort).skip(skip).limit(limitNum).session(session);
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);

    const [total, data] = await Promise.all([
      this.model.countDocuments(scopedFilter).session(session),
      query
    ]);

    return {
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    };
  }

  async countDocuments(filter = {}, organizationId, options = {}) {
    return await this.model.countDocuments(this._scopeFilter(filter, organizationId)).session(options.session || null);
  }

  async createScoped(data, organizationId, options = {}) {
    this._validateTenantScope(organizationId);
    const doc = new this.model({ ...data, organizationId });
    return await doc.save({ session: options.session || null });
  }

  async createManyScoped(dataArray = [], organizationId, options = {}) {
    this._validateTenantScope(organizationId);
    const docs = dataArray.map(item => ({ ...item, organizationId }));
    return await this.model.create(docs, { session: options.session || null });
  }

  async updateByIdAndTenant(id, updateData, organizationId, options = {}) {
    return await this.model.findOneAndUpdate(
      this._scopeFilter({ _id: id }, organizationId),
      updateData,
      { returnDocument: 'after', runValidators: true, ...options, session: options.session || null }
    );
  }

  async deleteByIdAndTenant(id, organizationId, options = {}) {
    return await this.model.findOneAndDelete(
      this._scopeFilter({ _id: id }, organizationId),
      { session: options.session || null }
    );
  }
}

export default BaseRepository;
