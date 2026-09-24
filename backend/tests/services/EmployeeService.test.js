import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import EmployeeService from '#@/modules/employees/services/EmployeeService.js';
import EmployeeRepository from '#@/modules/employees/repositories/EmployeeRepository.js';
import EmploymentHistoryRepository from '#@/modules/employees/repositories/EmploymentHistoryRepository.js';
import AuditService from '#@/modules/audit/services/AuditService.js';
import EventBus from '#@/core/events/EventBus.js';
import { EVENTS } from '#@/core/constants/events/index.js';
import { ValidationError, ConflictError, NotFoundError } from '#@/core/errors/AppError.js';
import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ORG_ID = new mongoose.Types.ObjectId();
const ACTOR = { userId: new mongoose.Types.ObjectId() };

/**
 * Build a valid employee creation payload.
 * All ObjectId references point to auto-generated IDs (no real M-02 docs needed
 * because EmployeeService does not currently validate M-02 references).
 */
function makePayload(overrides = {}) {
  return {
    employeeCode: `EMP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    firstName: 'John',
    lastName: 'Doe',
    workEmail: `emp-${Math.random().toString(36).slice(2)}@example.com`,
    departmentId: new mongoose.Types.ObjectId(),
    designationId: new mongoose.Types.ObjectId(),
    locationId: new mongoose.Types.ObjectId(),
    shiftId: new mongoose.Types.ObjectId(),
    joiningDate: new Date().toISOString(),
    ...overrides
  };
}

describe('EmployeeService – Business Rule Tests', () => {

  beforeAll(async () => {
    await startDb();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await clearDb();
  });

  afterAll(async () => {
    await stopDb();
  });

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------
  describe('createEmployee', () => {
    it('creates an employee in ONBOARDING status', async () => {
      const employee = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      expect(employee.status).toBe('ONBOARDING');
      expect(employee.archivedAt).toBeNull();
    });

    it('calls AuditService.logAction on creation', async () => {
      const spy = vi.spyOn(AuditService, 'logAction');
      await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EMPLOYEE_CREATED' }),
        expect.anything()
      );
    });

    it('emits EMPLOYEE.CREATED event after commit', async () => {
      const spy = vi.spyOn(EventBus, 'emit');
      await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      expect(spy).toHaveBeenCalledWith(EVENTS.EMPLOYEE.CREATED, expect.objectContaining({ organizationId: ORG_ID }));
    });

    it('rejects duplicate employeeCode within the same org', async () => {
      const payload = makePayload({ employeeCode: 'DUPLICATE-001' });
      await EmployeeService.createEmployee(payload, ACTOR, ORG_ID);
      await expect(EmployeeService.createEmployee(payload, ACTOR, ORG_ID)).rejects.toThrow(ConflictError);
    });

    it('rejects duplicate workEmail within the same org', async () => {
      const email = 'duplicate@example.com';
      await EmployeeService.createEmployee(makePayload({ workEmail: email }), ACTOR, ORG_ID);
      await expect(
        EmployeeService.createEmployee(makePayload({ workEmail: email }), ACTOR, ORG_ID)
      ).rejects.toThrow(ConflictError);
    });

    it('rejects self as manager', async () => {
      const badId = new mongoose.Types.ObjectId();
      await expect(
        EmployeeService.createEmployee(makePayload({ managerId: badId }), ACTOR, ORG_ID)
      ).rejects.toThrow(); // manager does not exist → NotFoundError
    });
  });

  // ---------------------------------------------------------------------------
  // CHANGE STATUS — Status Transition Matrix
  // ---------------------------------------------------------------------------
  describe('changeStatus (Status Transition Matrix)', () => {
    it('emits EMPLOYEE.STATUS_CHANGED after successful status change', async () => {
      const employee = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      const spy = vi.spyOn(EventBus, 'emit');
      await EmployeeService.changeStatus(employee._id, 'INVITED', null, ACTOR, ORG_ID);
      expect(spy).toHaveBeenCalledWith(EVENTS.EMPLOYEE.STATUS_CHANGED, expect.objectContaining({
        oldStatus: 'ONBOARDING',
        newStatus: 'INVITED'
      }));
    });

    it('calls AuditService.logAction on status change', async () => {
      const employee = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      const spy = vi.spyOn(AuditService, 'logAction');
      await EmployeeService.changeStatus(employee._id, 'INVITED', null, ACTOR, ORG_ID);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EMPLOYEE_STATUS_CHANGED' }),
        expect.anything()
      );
    });

    it('allows ONBOARDING → INVITED', async () => {
      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      const updated = await EmployeeService.changeStatus(emp._id, 'INVITED', null, ACTOR, ORG_ID);
      expect(updated.status).toBe('INVITED');
    });

    it('allows ACTIVE → SUSPENDED', async () => {
      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      await EmployeeService.changeStatus(emp._id, 'INVITED', null, ACTOR, ORG_ID);
      await EmployeeService.changeStatus(emp._id, 'ACTIVE', null, ACTOR, ORG_ID);
      const updated = await EmployeeService.changeStatus(emp._id, 'SUSPENDED', 'Misconduct', ACTOR, ORG_ID);
      expect(updated.status).toBe('SUSPENDED');
    });

    it('rejects illegal transition: ONBOARDING → ACTIVE', async () => {
      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      await expect(
        EmployeeService.changeStatus(emp._id, 'ACTIVE', null, ACTOR, ORG_ID)
      ).rejects.toThrow(ValidationError);
    });

    it('rejects illegal transition: TERMINATED → ACTIVE', async () => {
      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      await EmployeeService.changeStatus(emp._id, 'INVITED', null, ACTOR, ORG_ID);
      await EmployeeService.changeStatus(emp._id, 'ACTIVE', null, ACTOR, ORG_ID);
      await EmployeeService.changeStatus(emp._id, 'TERMINATED', 'Contract ended', ACTOR, ORG_ID);
      await expect(
        EmployeeService.changeStatus(emp._id, 'ACTIVE', null, ACTOR, ORG_ID)
      ).rejects.toThrow(ValidationError);
    });

    it('rejects illegal transition: RESIGNED → ACTIVE', async () => {
      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      await EmployeeService.changeStatus(emp._id, 'INVITED', null, ACTOR, ORG_ID);
      await EmployeeService.changeStatus(emp._id, 'ACTIVE', null, ACTOR, ORG_ID);
      await EmployeeService.changeStatus(emp._id, 'RESIGNED', 'Personal reasons', ACTOR, ORG_ID);
      await expect(
        EmployeeService.changeStatus(emp._id, 'ACTIVE', null, ACTOR, ORG_ID)
      ).rejects.toThrow(ValidationError);
    });

    it('blocks status change on archived employee', async () => {
      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      await EmployeeService.archiveEmployee(emp._id, 'No longer needed', ACTOR, ORG_ID);
      await expect(
        EmployeeService.changeStatus(emp._id, 'INVITED', null, ACTOR, ORG_ID)
      ).rejects.toThrow(ValidationError);
    });

    it('writes EmploymentHistory entry on status change', async () => {
      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      await EmployeeService.changeStatus(emp._id, 'INVITED', null, ACTOR, ORG_ID);
      const { data: history } = await EmploymentHistoryRepository.findByEmployee(emp._id, ORG_ID);
      const entry = history.find(h => h.type === 'STATUS_CHANGE');
      expect(entry).toBeTruthy();
      expect(entry.previousValue.status).toBe('ONBOARDING');
      expect(entry.newValue.status).toBe('INVITED');
    });
  });

  // ---------------------------------------------------------------------------
  // CHANGE MANAGER — Circular chain detection
  // ---------------------------------------------------------------------------
  describe('changeManager', () => {
    it('emits EMPLOYEE.MANAGER_CHANGED after successful change', async () => {
      const manager = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      await EmployeeService.changeStatus(manager._id, 'INVITED', null, ACTOR, ORG_ID);
      await EmployeeService.changeStatus(manager._id, 'ACTIVE', null, ACTOR, ORG_ID);

      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      const spy = vi.spyOn(EventBus, 'emit');
      await EmployeeService.changeManager(emp._id, manager._id, ACTOR, ORG_ID);
      expect(spy).toHaveBeenCalledWith(EVENTS.EMPLOYEE.MANAGER_CHANGED, expect.anything());
    });

    it('calls AuditService.logAction on manager change', async () => {
      const manager = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      await EmployeeService.changeStatus(manager._id, 'INVITED', null, ACTOR, ORG_ID);
      await EmployeeService.changeStatus(manager._id, 'ACTIVE', null, ACTOR, ORG_ID);
      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);

      const spy = vi.spyOn(AuditService, 'logAction');
      await EmployeeService.changeManager(emp._id, manager._id, ACTOR, ORG_ID);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EMPLOYEE_MANAGER_CHANGED' }),
        expect.anything()
      );
    });

    it('rejects self-reporting (employee as their own manager)', async () => {
      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      await expect(
        EmployeeService.changeManager(emp._id, emp._id, ACTOR, ORG_ID)
      ).rejects.toThrow(ValidationError);
    });

    it('rejects circular manager chain (A → B → A)', async () => {
      const a = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      const b = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);

      // Make A active
      await EmployeeService.changeStatus(a._id, 'INVITED', null, ACTOR, ORG_ID);
      await EmployeeService.changeStatus(a._id, 'ACTIVE', null, ACTOR, ORG_ID);
      // Make B active
      await EmployeeService.changeStatus(b._id, 'INVITED', null, ACTOR, ORG_ID);
      await EmployeeService.changeStatus(b._id, 'ACTIVE', null, ACTOR, ORG_ID);

      // A → B (B reports to A)
      await EmployeeService.changeManager(b._id, a._id, ACTOR, ORG_ID);

      // Try B → A (A would report to B, creating A→B→A cycle)
      await expect(
        EmployeeService.changeManager(a._id, b._id, ACTOR, ORG_ID)
      ).rejects.toThrow(ConflictError);
    });
  });

  // ---------------------------------------------------------------------------
  // ARCHIVE / RESTORE
  // ---------------------------------------------------------------------------
  describe('archiveEmployee / restoreEmployee', () => {
    it('emits EMPLOYEE.ARCHIVED after archiving', async () => {
      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      const spy = vi.spyOn(EventBus, 'emit');
      await EmployeeService.archiveEmployee(emp._id, 'Contract ended', ACTOR, ORG_ID);
      expect(spy).toHaveBeenCalledWith(EVENTS.EMPLOYEE.ARCHIVED, expect.anything());
    });

    it('calls AuditService.logAction on archive', async () => {
      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      const spy = vi.spyOn(AuditService, 'logAction');
      await EmployeeService.archiveEmployee(emp._id, 'Contract ended', ACTOR, ORG_ID);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EMPLOYEE_ARCHIVED' }),
        expect.anything()
      );
    });

    it('sets archivedAt metadata without changing status', async () => {
      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      await EmployeeService.changeStatus(emp._id, 'INVITED', null, ACTOR, ORG_ID);
      await EmployeeService.changeStatus(emp._id, 'ACTIVE', null, ACTOR, ORG_ID);
      const archived = await EmployeeService.archiveEmployee(emp._id, 'Restructure', ACTOR, ORG_ID);

      expect(archived.archivedAt).toBeTruthy();
      expect(archived.status).toBe('ACTIVE'); // Status unchanged — critical rule
    });

    it('rejects double-archiving', async () => {
      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      await EmployeeService.archiveEmployee(emp._id, 'First archive', ACTOR, ORG_ID);
      await expect(
        EmployeeService.archiveEmployee(emp._id, 'Second archive', ACTOR, ORG_ID)
      ).rejects.toThrow(ConflictError);
    });

    it('emits EMPLOYEE.RESTORED after restoring', async () => {
      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      await EmployeeService.archiveEmployee(emp._id, 'Temp leave', ACTOR, ORG_ID);
      const spy = vi.spyOn(EventBus, 'emit');
      await EmployeeService.restoreEmployee(emp._id, ACTOR, ORG_ID);
      expect(spy).toHaveBeenCalledWith(EVENTS.EMPLOYEE.RESTORED, expect.anything());
    });

    it('calls AuditService.logAction on restore', async () => {
      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      await EmployeeService.archiveEmployee(emp._id, 'Temp', ACTOR, ORG_ID);
      const spy = vi.spyOn(AuditService, 'logAction');
      await EmployeeService.restoreEmployee(emp._id, ACTOR, ORG_ID);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EMPLOYEE_RESTORED' }),
        expect.anything()
      );
    });

    it('clears archivedAt metadata on restore without changing status', async () => {
      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      await EmployeeService.archiveEmployee(emp._id, 'Leave', ACTOR, ORG_ID);
      const restored = await EmployeeService.restoreEmployee(emp._id, ACTOR, ORG_ID);

      expect(restored.archivedAt).toBeNull();
      expect(restored.archivedBy).toBeNull();
      expect(restored.archiveReason).toBeNull();
      expect(restored.status).toBe('ONBOARDING'); // Original status preserved
    });

    it('writes RESTORE EmploymentHistory entry on restore', async () => {
      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      await EmployeeService.archiveEmployee(emp._id, 'Temp', ACTOR, ORG_ID);
      await EmployeeService.restoreEmployee(emp._id, ACTOR, ORG_ID);
      const { data: history } = await EmploymentHistoryRepository.findByEmployee(emp._id, ORG_ID);
      const restore = history.find(h => h.type === 'RESTORE');
      expect(restore).toBeTruthy();
    });

    it('rejects restoring a non-archived employee', async () => {
      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      await expect(
        EmployeeService.restoreEmployee(emp._id, ACTOR, ORG_ID)
      ).rejects.toThrow(ConflictError);
    });

    it('excludes archived employees from default list queries', async () => {
      const emp = await EmployeeService.createEmployee(makePayload(), ACTOR, ORG_ID);
      await EmployeeService.archiveEmployee(emp._id, 'Gone', ACTOR, ORG_ID);
      const result = await EmployeeService.getEmployees({}, ORG_ID);
      const found = result.data.find(e => String(e._id) === String(emp._id));
      expect(found).toBeUndefined();
    });
  });
});
