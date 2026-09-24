import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import LocationRepository from '#@/modules/organization/repositories/LocationRepository.js';
import { TenantIsolationError } from '#@/core/errors/AppError.js';

describe('Exhaustive Repository Verification - Module M-02', () => {
  const org1 = new mongoose.Types.ObjectId().toString();
  const org2 = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    await startDb();
    await LocationRepository.model.init(); // Wait for indexes to build
  });

  afterEach(async () => {
    await clearDb();
  });

  afterAll(async () => {
    await stopDb();
  });

  describe('LocationRepository (Testing BaseRepository & Real DB Behavior)', () => {
    it('must enforce cross-tenant isolation on creation and retrieval', async () => {
      const loc1 = await LocationRepository.createScoped({ code: 'L1', name: 'N1', address: 'A1', timezone: 'UTC' }, org1);
      const loc2 = await LocationRepository.createScoped({ code: 'L1', name: 'N2', address: 'A2', timezone: 'UTC' }, org2);

      // We can create L1 in both orgs due to compound index { organizationId, code }
      expect(loc1._id).toBeDefined();
      expect(loc2._id).toBeDefined();

      // Retrieve from org1
      const foundOrg1 = await LocationRepository.findByCode('L1', org1);
      expect(foundOrg1.name).toBe('N1');

      // Cannot access loc1 from org2
      const foundCross = await LocationRepository.findByIdAndTenant(loc1._id, org2);
      expect(foundCross).toBeNull();
    });

    it('must enforce compound index (Duplicate key handling)', async () => {
      await LocationRepository.createScoped({ code: 'DUPE', name: 'N', address: 'A', timezone: 'UTC' }, org1);
      
      await expect(LocationRepository.createScoped({ code: 'DUPE', name: 'N', address: 'A', timezone: 'UTC' }, org1))
        .rejects
        .toThrow(/E11000 duplicate key error/);
    });

    it('must handle soft delete and restore behavior (archive filtering)', async () => {
      const loc = await LocationRepository.createScoped({ code: 'SOFT', name: 'N', address: 'A', timezone: 'UTC' }, org1);
      expect(loc.status).toBe('ACTIVE');

      // Soft delete
      const archived = await LocationRepository.updateByIdAndTenant(loc._id, { status: 'ARCHIVED', archiveReason: 'test' }, org1);
      expect(archived.status).toBe('ARCHIVED');
      expect(archived.archiveReason).toBe('test');

      // Filtering (if we query ACTIVE only)
      const activeOnly = await LocationRepository.find({ status: 'ACTIVE' }, org1);
      expect(activeOnly).toHaveLength(0);

      // Restore
      const restored = await LocationRepository.updateByIdAndTenant(loc._id, { status: 'ACTIVE', archiveReason: null, archivedAt: null, archivedBy: null }, org1);
      expect(restored.status).toBe('ACTIVE');
      expect(restored.archiveReason).toBeNull();
    });

    it('must support pagination, sorting, and searching', async () => {
      // Create 15 locations
      const docs = Array.from({ length: 15 }, (_, i) => ({
        code: `LOC${i.toString().padStart(2, '0')}`,
        name: `Name ${15 - i}`,
        address: 'Addr',
        timezone: 'UTC'
      }));
      
      for (const d of docs) {
        await LocationRepository.createScoped(d, org1);
      }

      // Pagination
      const page1 = await LocationRepository.findPaginated({ page: 1, limit: 10 }, org1);
      expect(page1.data).toHaveLength(10);
      expect(page1.pagination.total).toBe(15);
      expect(page1.pagination.page).toBe(1);

      const page2 = await LocationRepository.findPaginated({ page: 2, limit: 10 }, org1);
      expect(page2.data).toHaveLength(5);
      expect(page2.pagination.totalPages).toBe(2);

      // Sorting (by name ascending) -> 'Name 1', 'Name 10', etc.
      const sorted = await LocationRepository.findPaginated({ sort: { name: 1 }, limit: 5 }, org1);
      expect(sorted.data[0].name).toBe('Name 1');
      expect(sorted.data[1].name).toBe('Name 10'); // string sort

      // Searching (by code)
      const searched = await LocationRepository.findPaginated({ filter: { code: /LOC0/i }, limit: 20 }, org1);
      expect(searched.data).toHaveLength(10); // LOC00 to LOC09
    });

    it('must handle concurrent updates safely', async () => {
      const loc = await LocationRepository.createScoped({ code: 'CONCUR', name: 'N', address: 'A', timezone: 'UTC' }, org1);

      // Fire 5 updates simultaneously
      await Promise.all([
        LocationRepository.updateByIdAndTenant(loc._id, { name: 'A' }, org1),
        LocationRepository.updateByIdAndTenant(loc._id, { name: 'B' }, org1),
        LocationRepository.updateByIdAndTenant(loc._id, { name: 'C' }, org1),
        LocationRepository.updateByIdAndTenant(loc._id, { name: 'D' }, org1),
        LocationRepository.updateByIdAndTenant(loc._id, { name: 'FINAL' }, org1)
      ]);

      const updated = await LocationRepository.findByIdAndTenant(loc._id, org1);
      // It should be one of them, typically 'FINAL' but order isn't strictly guaranteed by JS Promise.all,
      // However, MongoDB guarantees atomic document updates, so it won't crash or corrupt.
      expect(['A', 'B', 'C', 'D', 'FINAL']).toContain(updated.name);
    });

    it('must enforce TenantIsolationError if no organizationId is provided', async () => {
      await expect(LocationRepository.findByCode('MGR', null))
        .rejects
        .toThrow(TenantIsolationError);
      
      await expect(LocationRepository.createScoped({ code: 'MGR' }, null))
        .rejects
        .toThrow(TenantIsolationError);
    });
  });
});
