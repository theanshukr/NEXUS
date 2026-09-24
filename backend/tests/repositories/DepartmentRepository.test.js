import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import DepartmentRepository from '#@/modules/departments/repositories/DepartmentRepository.js';
import Department from '#@/modules/departments/models/Department.js';
import { TenantIsolationError } from '#@/core/errors/AppError.js';
import mongoose from 'mongoose';

describe('DepartmentRepository – Layer 1 & Tenant Isolation Contract', () => {
  const ORG_A = new mongoose.Types.ObjectId();
  const ORG_B = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    await startDb();
    // Mongoose autoIndex is async — explicitly build all schema-declared indexes
    // so the compound unique (organizationId, code) constraint is enforced on
    // the very first write in this in-memory replica set instance.
    await Department.createIndexes();
  });

  afterEach(async () => {
    await clearDb();
  });

  afterAll(async () => {
    await stopDb();
  });

  it('enforces tenant scoping when finding by code', async () => {
    await DepartmentRepository.createScoped({
      code: 'ENG',
      name: 'Engineering A',
      level: 0,
      status: 'ACTIVE'
    }, ORG_A);

    await DepartmentRepository.createScoped({
      code: 'ENG',
      name: 'Engineering B',
      level: 0,
      status: 'ACTIVE'
    }, ORG_B);

    const foundA = await DepartmentRepository.findByCode('ENG', ORG_A);
    const foundB = await DepartmentRepository.findByCode('ENG', ORG_B);

    expect(foundA).toBeDefined();
    expect(foundA.name).toBe('Engineering A');
    expect(foundB).toBeDefined();
    expect(foundB.name).toBe('Engineering B');
  });

  it('throws fatal TenantIsolationError if query is attempted without organizationId', async () => {
    await expect(DepartmentRepository.findByCode('ENG', undefined)).rejects.toThrow(TenantIsolationError);
  });

  it('enforces compound uniqueness on (organizationId, code)', async () => {
    await DepartmentRepository.createScoped({
      code: 'ENG',
      name: 'Engineering',
      level: 0,
      status: 'ACTIVE'
    }, ORG_A);

    await expect(DepartmentRepository.createScoped({
      code: 'ENG',
      name: 'Duplicate Engineering',
      level: 0,
      status: 'ACTIVE'
    }, ORG_A)).rejects.toThrow(/E11000/);
  });

  it('finds roots and descendants using Materialized Path ancestors array', async () => {
    const root = await DepartmentRepository.createScoped({
      code: 'TECH',
      name: 'Technology',
      level: 0,
      status: 'ACTIVE',
      ancestors: []
    }, ORG_A);

    const child = await DepartmentRepository.createScoped({
      code: 'DEV',
      name: 'Development',
      parentDepartmentId: root._id,
      level: 1,
      status: 'ACTIVE',
      ancestors: [{ _id: root._id, code: root.code, name: root.name, level: 0 }]
    }, ORG_A);

    const roots = await DepartmentRepository.findRoots(ORG_A);
    expect(roots).toHaveLength(1);
    expect(roots[0].code).toBe('TECH');

    const descendants = await DepartmentRepository.findDescendants(root._id, ORG_A);
    expect(descendants).toHaveLength(1);
    expect(descendants[0].code).toBe('DEV');
  });

  it('updates ancestor metadata across descendants when parent is renamed', async () => {
    const root = await DepartmentRepository.createScoped({
      code: 'TECH',
      name: 'Technology',
      level: 0,
      status: 'ACTIVE',
      ancestors: []
    }, ORG_A);

    const child = await DepartmentRepository.createScoped({
      code: 'DEV',
      name: 'Development',
      parentDepartmentId: root._id,
      level: 1,
      status: 'ACTIVE',
      ancestors: [{ _id: root._id, code: root.code, name: root.name, level: 0 }]
    }, ORG_A);

    await DepartmentRepository.updateDescendantAncestorMetadata(root._id, 'New Technology', 'NEWTECH', ORG_A);

    const updatedChild = await DepartmentRepository.findByIdAndTenant(child._id, ORG_A);
    expect(updatedChild.ancestors[0].name).toBe('New Technology');
    expect(updatedChild.ancestors[0].code).toBe('NEWTECH');
  });

  it('rejects cross-tenant parent lookups by returning null for parents in another tenant', async () => {
    const parentInB = await DepartmentRepository.createScoped({
      code: 'PAR_B',
      name: 'Parent in B',
      level: 0,
      status: 'ACTIVE'
    }, ORG_B);

    const lookupFromA = await DepartmentRepository.findByIdAndTenant(parentInB._id, ORG_A);
    expect(lookupFromA).toBeNull();
  });

  it('throws CastError or validation error when queried with an invalid parent ObjectId', async () => {
    await expect(DepartmentRepository.findDescendants('invalid-object-id-string', ORG_A)).rejects.toThrow();
  });

  it('updates root queries when moving a child department to root (parentDepartmentId: null)', async () => {
    const root = await DepartmentRepository.createScoped({
      code: 'ROOT1',
      name: 'Root One',
      level: 0,
      status: 'ACTIVE'
    }, ORG_A);

    const child = await DepartmentRepository.createScoped({
      code: 'CHILD1',
      name: 'Child One',
      parentDepartmentId: root._id,
      level: 1,
      status: 'ACTIVE',
      ancestors: [{ _id: root._id, code: root.code, name: root.name, level: 0 }]
    }, ORG_A);

    let roots = await DepartmentRepository.findRoots(ORG_A);
    expect(roots.map(r => r.code)).not.toContain('CHILD1');

    await DepartmentRepository.updateByIdAndTenant(child._id, {
      parentDepartmentId: null,
      level: 0,
      ancestors: []
    }, ORG_A);

    roots = await DepartmentRepository.findRoots(ORG_A);
    expect(roots.map(r => r.code)).toContain('CHILD1');
  });

  it('excludes archived departments from root queries', async () => {
    const root = await DepartmentRepository.createScoped({
      code: 'ROOT_ARCH',
      name: 'To Be Archived',
      level: 0,
      status: 'ACTIVE'
    }, ORG_A);

    let roots = await DepartmentRepository.findRoots(ORG_A);
    expect(roots.map(r => r.code)).toContain('ROOT_ARCH');

    await DepartmentRepository.updateByIdAndTenant(root._id, {
      status: 'ARCHIVED'
    }, ORG_A);

    roots = await DepartmentRepository.findRoots(ORG_A);
    expect(roots.map(r => r.code)).not.toContain('ROOT_ARCH');
  });

  it('maintains ancestor array integrity (level, ObjectId correctness, ordering) across hierarchy levels', async () => {
    const gp = await DepartmentRepository.createScoped({
      code: 'GP_INT',
      name: 'Grandparent',
      level: 0,
      status: 'ACTIVE',
      ancestors: []
    }, ORG_A);

    const p = await DepartmentRepository.createScoped({
      code: 'P_INT',
      name: 'Parent',
      parentDepartmentId: gp._id,
      level: 1,
      status: 'ACTIVE',
      ancestors: [{ _id: gp._id, code: gp.code, name: gp.name, level: 0 }]
    }, ORG_A);

    const c = await DepartmentRepository.createScoped({
      code: 'C_INT',
      name: 'Child',
      parentDepartmentId: p._id,
      level: 2,
      status: 'ACTIVE',
      ancestors: [
        { _id: gp._id, code: gp.code, name: gp.name, level: 0 },
        { _id: p._id, code: p.code, name: p.name, level: 1 }
      ]
    }, ORG_A);

    const childFetched = await DepartmentRepository.findByIdAndTenant(c._id, ORG_A);
    expect(childFetched.level).toBe(2);
    expect(childFetched.ancestors).toHaveLength(2);
    // Verify ordering correctness (index 0 = root, index 1 = immediate parent)
    expect(childFetched.ancestors[0].level).toBe(0);
    expect(childFetched.ancestors[1].level).toBe(1);
    // Verify ObjectId correctness
    expect(childFetched.ancestors[0]._id.toString()).toBe(gp._id.toString());
    expect(childFetched.ancestors[1]._id.toString()).toBe(p._id.toString());
  });
});
