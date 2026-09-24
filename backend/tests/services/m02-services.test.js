import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { startDb, clearDb, stopDb } from '../setup/db.js';

import LocationService from '#@/modules/organization/services/LocationService.js';
import ShiftService from '#@/modules/organization/services/ShiftService.js';
import DesignationService from '#@/modules/organization/services/DesignationService.js';
import HolidayCalendarService from '#@/modules/organization/services/HolidayCalendarService.js';
import DepartmentService from '#@/modules/departments/services/DepartmentService.js';

import AuditService from '#@/modules/audit/services/AuditService.js';
import EventBus from '#@/core/events/EventBus.js';
import EVENTS from '#@/core/constants/events/index.js';
import { ConflictError, ValidationError } from '#@/core/errors/AppError.js';

vi.mock('#@/modules/audit/services/AuditService.js');
vi.mock('#@/core/events/EventBus.js');

describe('Exhaustive Service Verification - Module M-02', () => {
  const org1 = new mongoose.Types.ObjectId().toString();
  const actor = { userId: new mongoose.Types.ObjectId().toString() };

  beforeAll(async () => {
    await startDb();
  });

  afterEach(async () => {
    await clearDb();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await stopDb();
  });

  describe('LocationService', () => {
    it('Happy path: createLocation logs audit and emits event', async () => {
      const loc = await LocationService.createLocation({ code: 'LOC1', name: 'NY', address: '123 Main', timezone: 'UTC' }, actor, org1);
      
      expect(loc._id).toBeDefined();
      expect(AuditService.logAction).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CREATE_LOCATION',
        entityId: loc._id
      }), expect.any(Object));
      expect(EventBus.emit).toHaveBeenCalledWith(EVENTS.LOCATION.CREATED, expect.objectContaining({
        locationId: loc._id
      }));
    });

    it('Failure path: prevents duplicate code', async () => {
      await LocationService.createLocation({ code: 'LOC2', name: 'N', address: 'A', timezone: 'UTC' }, actor, org1);
      
      await expect(LocationService.createLocation({ code: 'LOC2', name: 'N2', address: 'A2', timezone: 'UTC' }, actor, org1))
        .rejects
        .toThrow(ConflictError);
    });

    it('Archive restrictions: prevents archiving location if future holiday calendar exists', async () => {
      const loc = await LocationService.createLocation({ code: 'LOC3', name: 'N', address: 'A', timezone: 'UTC' }, actor, org1);
      
      // Create holiday calendar in the future
      await HolidayCalendarService.createOrUpdateCalendar(loc._id, 2050, { holidays: [] }, actor, org1);
      
      vi.clearAllMocks(); // Clear create mocks

      await expect(LocationService.archiveLocation(loc._id, 'closing', actor, org1))
        .rejects
        .toThrow(ConflictError);
      
      expect(AuditService.logAction).not.toHaveBeenCalled();
    });
  });

  describe('ShiftService', () => {
    it('Happy path: create, update, and archive', async () => {
      const shift = await ShiftService.createShift({ code: 'SHF1', name: 'Morning', startTime: '09:00', endTime: '17:00' }, actor, org1);
      
      expect(EventBus.emit).toHaveBeenCalledWith(EVENTS.SHIFT.CREATED, expect.any(Object));

      const updated = await ShiftService.updateShift(shift._id, { name: 'Day' }, actor, org1);
      expect(updated.name).toBe('Day');
      expect(EventBus.emit).toHaveBeenCalledWith(EVENTS.SHIFT.UPDATED, expect.any(Object));

      await ShiftService.archiveShift(shift._id, 'deprecated', actor, org1);
      expect(EventBus.emit).toHaveBeenCalledWith(EVENTS.SHIFT.ARCHIVED, expect.any(Object));
    });
  });

  describe('DesignationService', () => {
    it('Business rule: rejects update if designation is archived', async () => {
      const des = await DesignationService.createDesignation({ code: 'DSG1', title: 'T1' }, actor, org1);
      await DesignationService.archiveDesignation(des._id, 'old', actor, org1);
      
      await expect(DesignationService.updateDesignation(des._id, { title: 'T2' }, actor, org1))
        .rejects
        .toThrow(ValidationError); // Cannot update archived
    });
  });

  describe('DepartmentService', () => {
    it('Hierarchy rules: prevents circular parent assignment', async () => {
      const parent = await DepartmentService.createDepartment({ code: 'D1', name: 'P' }, actor, org1);
      const child = await DepartmentService.createDepartment({ code: 'D2', name: 'C', parentDepartmentId: parent._id }, actor, org1);

      // Attempt to make parent a child of its own child
      await expect(DepartmentService.updateDepartment(parent._id, { parentDepartmentId: child._id }, actor, org1))
        .rejects
        .toThrow(ConflictError); // The service throws ConflictError for circular dependency
    });

    it('Hierarchy rules: prevents archiving department if it has active sub-departments', async () => {
      const parent = await DepartmentService.createDepartment({ code: 'D3', name: 'P2' }, actor, org1);
      await DepartmentService.createDepartment({ code: 'D4', name: 'C2', parentDepartmentId: parent._id }, actor, org1);

      await expect(DepartmentService.archiveDepartment(parent._id, 'closing', actor, org1))
        .rejects
        .toThrow(ConflictError);
    });
  });

});
