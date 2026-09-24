import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import DepartmentService from '#@/modules/departments/services/DepartmentService.js';
import DepartmentRepository from '#@/modules/departments/repositories/DepartmentRepository.js';
import AuditService from '#@/modules/audit/services/AuditService.js';
import cacheService from '#@/platform/cache/index.js';
import EventBus from '#@/core/events/EventBus.js';
import EVENTS from '#@/core/constants/events/index.js';
import { ConflictError, ValidationError } from '#@/core/errors/AppError.js';
import mongoose from 'mongoose';

describe('DepartmentService – Layer 2 & Business Rule Tests', () => {
  const ORG_ID = new mongoose.Types.ObjectId();
  const ACTOR = { userId: new mongoose.Types.ObjectId() };

  beforeAll(async () => {
    await startDb();
  });

  afterEach(async () => {
    await clearDb();
  });

  afterAll(async () => {
    await stopDb();
  });

  it('prevents self-parenting (BR-O03)', async () => {
    const dept = await DepartmentService.createDepartment({
      code: 'ENG',
      name: 'Engineering'
    }, ACTOR, ORG_ID);

    await expect(DepartmentService.updateDepartment(dept._id, {
      parentDepartmentId: dept._id
    }, ACTOR, ORG_ID)).rejects.toThrow(ConflictError);
  });

  it('prevents circular hierarchy when moving parent under child (BR-O03)', async () => {
    const grandparent = await DepartmentService.createDepartment({
      code: 'GP',
      name: 'Grandparent'
    }, ACTOR, ORG_ID);

    const parent = await DepartmentService.createDepartment({
      code: 'P',
      name: 'Parent',
      parentDepartmentId: grandparent._id
    }, ACTOR, ORG_ID);

    const child = await DepartmentService.createDepartment({
      code: 'C',
      name: 'Child',
      parentDepartmentId: parent._id
    }, ACTOR, ORG_ID);

    await expect(DepartmentService.moveDepartment(grandparent._id, child._id, ACTOR, ORG_ID)).rejects.toThrow(ConflictError);
  });

  it('prevents archiving a department if active employees are assigned (BR-O01)', async () => {
    const dept = await DepartmentService.createDepartment({
      code: 'HR',
      name: 'Human Resources'
    }, ACTOR, ORG_ID);

    // Simulate active employees assigned to this department
    await DepartmentRepository.updateByIdAndTenant(dept._id, { cachedEmployeeCount: 5 }, ORG_ID);

    await expect(DepartmentService.archiveDepartment(dept._id, 'Reorg', ACTOR, ORG_ID)).rejects.toThrow(ConflictError);

    const check = await DepartmentRepository.findByIdAndTenant(dept._id, ORG_ID);
    expect(check.status).toBe('ACTIVE');
  });

  it('prevents archiving a department if active subordinate departments exist', async () => {
    const parent = await DepartmentService.createDepartment({
      code: 'FIN',
      name: 'Finance'
    }, ACTOR, ORG_ID);

    await DepartmentService.createDepartment({
      code: 'ACC',
      name: 'Accounting',
      parentDepartmentId: parent._id
    }, ACTOR, ORG_ID);

    await expect(DepartmentService.archiveDepartment(parent._id, 'Reorg', ACTOR, ORG_ID)).rejects.toThrow(ConflictError);
  });

  it('builds nested JSON hierarchy tree and caches the result', async () => {
    const root = await DepartmentService.createDepartment({
      code: 'EXEC',
      name: 'Executive'
    }, ACTOR, ORG_ID);

    const child = await DepartmentService.createDepartment({
      code: 'OPS',
      name: 'Operations',
      parentDepartmentId: root._id
    }, ACTOR, ORG_ID);

    const tree = await DepartmentService.getDepartmentTree(ORG_ID);
    expect(tree).toHaveLength(1);
    expect(tree[0].code).toBe('EXEC');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].code).toBe('OPS');
  });

  it('updates materialized path level and ancestors when re-parenting a subtree', async () => {
    const tech = await DepartmentService.createDepartment({
      code: 'TECH',
      name: 'Technology'
    }, ACTOR, ORG_ID);

    const ops = await DepartmentService.createDepartment({
      code: 'OPS',
      name: 'Operations'
    }, ACTOR, ORG_ID);

    const dev = await DepartmentService.createDepartment({
      code: 'DEV',
      name: 'Development',
      parentDepartmentId: tech._id
    }, ACTOR, ORG_ID);

    const qa = await DepartmentService.createDepartment({
      code: 'QA',
      name: 'Quality Assurance',
      parentDepartmentId: dev._id
    }, ACTOR, ORG_ID);

    expect(qa.level).toBe(2);
    expect(qa.ancestors).toHaveLength(2);

    // Move DEV from TECH to OPS
    await DepartmentService.moveDepartment(dev._id, ops._id, ACTOR, ORG_ID);

    const updatedDev = await DepartmentRepository.findByIdAndTenant(dev._id, ORG_ID);
    const updatedQa = await DepartmentRepository.findByIdAndTenant(qa._id, ORG_ID);

    expect(updatedDev.parentDepartmentId.toString()).toBe(ops._id.toString());
    expect(updatedDev.ancestors[0].code).toBe('OPS');
    expect(updatedQa.level).toBe(2);
    expect(updatedQa.ancestors[0].code).toBe('OPS');
    expect(updatedQa.ancestors[1].code).toBe('DEV');
  });

  it('rejects cross-tenant department moves', async () => {
    const ORG_B = new mongoose.Types.ObjectId();
    const deptInA = await DepartmentService.createDepartment({ code: 'DEPT_A', name: 'Dept A' }, ACTOR, ORG_ID);
    const deptInB = await DepartmentRepository.createScoped({ code: 'DEPT_B', name: 'Dept B', level: 0, status: 'ACTIVE' }, ORG_B);

    await expect(DepartmentService.moveDepartment(deptInA._id, deptInB._id, ACTOR, ORG_ID)).rejects.toThrow(ValidationError);
  });

  it('enforces duplicate code business validation on create and update', async () => {
    const dept1 = await DepartmentService.createDepartment({ code: 'DUP_CODE', name: 'First Dept' }, ACTOR, ORG_ID);
    await expect(DepartmentService.createDepartment({ code: 'DUP_CODE', name: 'Second Dept' }, ACTOR, ORG_ID)).rejects.toThrow(ConflictError);

    const dept2 = await DepartmentService.createDepartment({ code: 'OTHER_CODE', name: 'Other Dept' }, ACTOR, ORG_ID);
    await expect(DepartmentService.updateDepartment(dept2._id, { code: 'DUP_CODE' }, ACTOR, ORG_ID)).rejects.toThrow(ConflictError);
  });

  it('invalidates department Redis cache upon creation, update, and archive', async () => {
    const spyDelete = vi.spyOn(cacheService, 'delete');
    
    // Populate cache first so that keys exist to be deleted
    await DepartmentService.getDepartmentTree(ORG_ID);
    const dept = await DepartmentService.createDepartment({ code: 'CACHE_TEST', name: 'Cache Dept' }, ACTOR, ORG_ID);
    expect(spyDelete).toHaveBeenCalled();

    spyDelete.mockClear();
    await DepartmentService.getDepartmentTree(ORG_ID);
    await DepartmentService.updateDepartment(dept._id, { name: 'Updated Cache Dept' }, ACTOR, ORG_ID);
    expect(spyDelete).toHaveBeenCalled();

    spyDelete.mockClear();
    await DepartmentService.getDepartmentTree(ORG_ID);
    await DepartmentService.archiveDepartment(dept._id, 'Testing cache', ACTOR, ORG_ID);
    expect(spyDelete).toHaveBeenCalled();
  });

  it('invokes AuditService on create, update, and archive actions', async () => {
    const spyAudit = vi.spyOn(AuditService, 'logAction');
    const dept = await DepartmentService.createDepartment({ code: 'AUDIT_TEST', name: 'Audit Dept' }, ACTOR, ORG_ID);
    expect(spyAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DEPARTMENT_CREATED', entityId: dept._id }),
      expect.anything()
    );

    spyAudit.mockClear();
    await DepartmentService.updateDepartment(dept._id, { name: 'Renamed Audit Dept' }, ACTOR, ORG_ID);
    expect(spyAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DEPARTMENT_UPDATED', entityId: dept._id }),
      expect.anything()
    );

    spyAudit.mockClear();
    await DepartmentService.archiveDepartment(dept._id, 'Audit test', ACTOR, ORG_ID);
    expect(spyAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DEPARTMENT_ARCHIVED', entityId: dept._id }),
      expect.anything()
    );
  });

  it('rolls back transaction on update failure when hierarchy changes fail mid-operation', async () => {
    const root = await DepartmentService.createDepartment({ code: 'TX_ROOT', name: 'Root' }, ACTOR, ORG_ID);
    const child = await DepartmentService.createDepartment({ code: 'TX_CHILD', name: 'Child', parentDepartmentId: root._id }, ACTOR, ORG_ID);

    const spyUpdateDescendants = vi.spyOn(DepartmentRepository, 'updateByIdAndTenant').mockRejectedValueOnce(new Error('Simulated DB Failure'));

    await expect(DepartmentService.updateDepartment(root._id, { name: 'Failed Name' }, ACTOR, ORG_ID)).rejects.toThrow('Simulated DB Failure');

    spyUpdateDescendants.mockRestore();
    const unchangedRoot = await DepartmentRepository.findByIdAndTenant(root._id, ORG_ID);
    expect(unchangedRoot.name).toBe('Root');
  });

  it('updates materialized path and levels across large subtrees (4+ levels deep)', async () => {
    const root1 = await DepartmentService.createDepartment({ code: 'R1', name: 'Root One' }, ACTOR, ORG_ID);
    const root2 = await DepartmentService.createDepartment({ code: 'R2', name: 'Root Two' }, ACTOR, ORG_ID);
    const l1 = await DepartmentService.createDepartment({ code: 'L1', name: 'Level 1', parentDepartmentId: root1._id }, ACTOR, ORG_ID);
    const l2 = await DepartmentService.createDepartment({ code: 'L2', name: 'Level 2', parentDepartmentId: l1._id }, ACTOR, ORG_ID);
    const l3 = await DepartmentService.createDepartment({ code: 'L3', name: 'Level 3', parentDepartmentId: l2._id }, ACTOR, ORG_ID);
    const l4 = await DepartmentService.createDepartment({ code: 'L4', name: 'Level 4', parentDepartmentId: l3._id }, ACTOR, ORG_ID);

    expect(l4.level).toBe(4);
    expect(l4.ancestors.map(a => a.code)).toEqual(['R1', 'L1', 'L2', 'L3']);

    // Move L1 under Root2
    await DepartmentService.moveDepartment(l1._id, root2._id, ACTOR, ORG_ID);

    const updatedL4 = await DepartmentRepository.findByIdAndTenant(l4._id, ORG_ID);
    expect(updatedL4.level).toBe(4);
    expect(updatedL4.ancestors.map(a => a.code)).toEqual(['R2', 'L1', 'L2', 'L3']);
  });

  it('updates root department cleanly without altering root status', async () => {
    const root = await DepartmentService.createDepartment({ code: 'ROOT_ORIG', name: 'Original Root' }, ACTOR, ORG_ID);
    const updated = await DepartmentService.updateDepartment(root._id, { code: 'ROOT_NEW', name: 'New Root' }, ACTOR, ORG_ID);

    expect(updated.level).toBe(0);
    expect(updated.parentDepartmentId).toBeNull();
    expect(updated.code).toBe('ROOT_NEW');
    expect(updated.name).toBe('New Root');
  });

  it('updates descendant ancestor metadata when renaming parent department', async () => {
    const parent = await DepartmentService.createDepartment({ code: 'PAR_ORIG', name: 'Parent Original' }, ACTOR, ORG_ID);
    const child = await DepartmentService.createDepartment({ code: 'CH_ORIG', name: 'Child Original', parentDepartmentId: parent._id }, ACTOR, ORG_ID);

    await DepartmentService.updateDepartment(parent._id, { code: 'PAR_REN', name: 'Parent Renamed' }, ACTOR, ORG_ID);

    const updatedChild = await DepartmentRepository.findByIdAndTenant(child._id, ORG_ID);
    expect(updatedChild.ancestors[0].code).toBe('PAR_REN');
    expect(updatedChild.ancestors[0].name).toBe('Parent Renamed');
  });
  it('emits domain events and audit logs upon creation, update, and archival', async () => {
    const auditSpy = vi.spyOn(AuditService, 'logAction').mockResolvedValue(true);
    const eventSpy = vi.spyOn(EventBus, 'emit');

    // Create
    const created = await DepartmentService.createDepartment({ code: 'EVT1', name: 'Event Dept' }, ACTOR, ORG_ID);
    
    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({ action: 'DEPARTMENT_CREATED' }), expect.any(Object));
    expect(eventSpy).toHaveBeenCalledWith(EVENTS.DEPARTMENT.CREATED, expect.objectContaining({
      organizationId: ORG_ID,
      departmentId: created._id,
      code: 'EVT1',
      name: 'Event Dept'
    }));

    // Update
    await DepartmentService.updateDepartment(created._id, { name: 'Updated Event Dept' }, ACTOR, ORG_ID);
    
    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({ action: 'DEPARTMENT_UPDATED' }), expect.any(Object));
    expect(eventSpy).toHaveBeenCalledWith(EVENTS.DEPARTMENT.UPDATED, expect.objectContaining({
      organizationId: ORG_ID,
      departmentId: created._id,
      changes: expect.objectContaining({ name: 'Updated Event Dept' })
    }), expect.objectContaining({ skipQueue: true }));

    // Archive
    await DepartmentService.archiveDepartment(created._id, 'Closing down', ACTOR, ORG_ID);

    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({ action: 'DEPARTMENT_ARCHIVED' }), expect.any(Object));
    expect(eventSpy).toHaveBeenCalledWith(EVENTS.DEPARTMENT.ARCHIVED, expect.objectContaining({
      organizationId: ORG_ID,
      departmentId: created._id,
      archiveReason: 'Closing down'
    }));
  });
});
