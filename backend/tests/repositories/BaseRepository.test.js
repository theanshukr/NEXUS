import { describe, it, expect } from 'vitest';
import { BaseRepository } from '#@/core/repositories/BaseRepository.js';
import { TenantIsolationError } from '#@/core/errors/AppError.js';

/**
 * Phase 2 – BaseRepository Unit Tests
 *
 * Tests the core multi-tenant safety contract of BaseRepository._scopeFilter.
 * Uses a minimal Mongoose model mock — no live DB connection required.
 */
describe('BaseRepository – Tenant Isolation Contract', () => {
  // ─── Build a lightweight mock Mongoose model ──────────────────────────────
  function buildMockModel(name = 'TestModel') {
    const records = [];
    return {
      modelName: name,
      find: (filter) => ({
        session: () => Promise.resolve(records.filter(r => {
          return Object.keys(filter).every(k => String(r[k]) === String(filter[k]));
        }))
      }),
      findOne: (filter) => ({
        session: () => Promise.resolve(records.find(r =>
          Object.keys(filter).every(k => String(r[k]) === String(filter[k]))
        ) || null)
      }),
      countDocuments: (filter) => ({
        session: () => Promise.resolve(records.filter(r =>
          Object.keys(filter).every(k => String(r[k]) === String(filter[k]))
        ).length)
      }),
      findOneAndUpdate: () => ({ session: () => Promise.resolve(null) }),
      findOneAndDelete: () => ({ session: () => Promise.resolve(null) }),
      prototype: {},
      _records: records,
    };
  }

  // A concrete subclass for testing
  class ConcreteRepo extends BaseRepository {
    constructor(model) { super(model); }
  }

  const ORG_A = 'org_aaaa';
  const ORG_B = 'org_bbbb';

  it('_scopeFilter merges organizationId into provided filter', () => {
    const mockModel = buildMockModel();
    const repo = new ConcreteRepo(mockModel);
    const scoped = repo._scopeFilter({ status: 'ACTIVE' }, ORG_A);
    expect(scoped).toEqual({ status: 'ACTIVE', organizationId: ORG_A });
  });

  it('_scopeFilter throws TenantIsolationError when organizationId is undefined', () => {
    const mockModel = buildMockModel();
    const repo = new ConcreteRepo(mockModel);
    expect(() => repo._scopeFilter({}, undefined)).toThrow(TenantIsolationError);
  });

  it('_scopeFilter throws TenantIsolationError when organizationId is null', () => {
    const mockModel = buildMockModel();
    const repo = new ConcreteRepo(mockModel);
    expect(() => repo._scopeFilter({}, null)).toThrow(TenantIsolationError);
  });

  it('_scopeFilter throws TenantIsolationError when organizationId is empty string', () => {
    const mockModel = buildMockModel();
    const repo = new ConcreteRepo(mockModel);
    expect(() => repo._scopeFilter({}, '')).toThrow(TenantIsolationError);
  });

  it('createScoped throws TenantIsolationError when organizationId is missing', async () => {
    const mockModel = buildMockModel();
    // Override to simulate save
    mockModel.prototype = { save: async () => {} };
    // We need a proper constructor mock for `new this.model()`
    const mockModelConstructor = function(data) { Object.assign(this, data); };
    mockModelConstructor.modelName = 'TestModel';
    mockModelConstructor.prototype.save = async () => ({});
    mockModelConstructor._records = [];

    const repo = new ConcreteRepo(mockModelConstructor);
    await expect(repo.createScoped({ name: 'Test' }, null)).rejects.toThrow(TenantIsolationError);
    await expect(repo.createScoped({ name: 'Test' }, undefined)).rejects.toThrow(TenantIsolationError);
  });

  it('createManyScoped throws TenantIsolationError when organizationId is missing', async () => {
    const mockModel = buildMockModel();
    mockModel.create = async () => [];
    const repo = new ConcreteRepo(mockModel);
    await expect(repo.createManyScoped([{ name: 'A' }], undefined)).rejects.toThrow(TenantIsolationError);
  });

  it('_scopeFilter with empty filter adds only organizationId', () => {
    const mockModel = buildMockModel();
    const repo = new ConcreteRepo(mockModel);
    expect(repo._scopeFilter({}, ORG_A)).toEqual({ organizationId: ORG_A });
  });

  it('_scopeFilter does NOT mutate the original filter object', () => {
    const mockModel = buildMockModel();
    const repo = new ConcreteRepo(mockModel);
    const original = { status: 'ACTIVE' };
    repo._scopeFilter(original, ORG_A);
    expect(original).toEqual({ status: 'ACTIVE' }); // unchanged
  });

  it('two different organizationIds produce two different scoped filters', () => {
    const mockModel = buildMockModel();
    const repo = new ConcreteRepo(mockModel);
    const scopeA = repo._scopeFilter({ type: 'user' }, ORG_A);
    const scopeB = repo._scopeFilter({ type: 'user' }, ORG_B);
    expect(scopeA.organizationId).not.toBe(scopeB.organizationId);
  });
});
