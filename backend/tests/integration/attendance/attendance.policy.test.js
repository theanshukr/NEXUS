import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import AttendancePolicyService from '#@/modules/attendance/services/AttendancePolicyService.js';
import AttendancePolicyRepository from '#@/modules/attendance/repositories/AttendancePolicyRepository.js';
import LocationRepository from '#@/modules/organization/repositories/LocationRepository.js';
import AuditService from '#@/modules/audit/services/AuditService.js';
import { NotFoundError, ConflictError, ValidationError } from '#@/core/errors/AppError.js';
import { startDb, stopDb } from '../../setup/db.js';

beforeAll(async () => {
  await startDb();
});

afterAll(async () => {
  await stopDb();
});

describe('AttendancePolicyService (100% Coverage & Hierarchy Verification)', () => {
  let orgId, actor, locationId;

  beforeEach(async () => {
    vi.clearAllMocks();
    orgId = new mongoose.Types.ObjectId();
    locationId = new mongoose.Types.ObjectId();
    actor = { userId: new mongoose.Types.ObjectId() };
  });

  describe('createPolicy', () => {
    it('creates an attendance policy successfully and logs audit event', async () => {
      const payload = {
        name: 'Standard Day Shift Policy',
        isDefault: false,
        lateAfterMinutes: 15,
        halfDayAfterHours: 4,
        minimumWorkingHours: 8,
        overtimeStartsAfterHours: 9,
        autoApproveGeofence: false
      };

      const auditSpy = vi.spyOn(AuditService, 'logAction').mockResolvedValue(true);

      const policy = await AttendancePolicyService.createPolicy(payload, actor, orgId);
      expect(policy).toBeDefined();
      expect(policy.name).toBe('Standard Day Shift Policy');
      expect(policy.isDefault).toBe(false);
      expect(policy.lateAfterMinutes).toBe(15);
      expect(policy.status).toBe('ACTIVE');

      expect(auditSpy).toHaveBeenCalledTimes(1);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          actorId: actor.userId,
          action: 'CREATE_ATTENDANCE_POLICY',
          entityType: 'AttendancePolicy',
          entityId: policy._id,
          newValue: { name: policy.name, isDefault: policy.isDefault }
        }),
        expect.any(Object)
      );
    });

    it('uses system defaults when optional numeric parameters are omitted', async () => {
      const policy = await AttendancePolicyService.createPolicy({ name: 'Minimal Policy' }, actor, orgId);
      expect(policy.lateAfterMinutes).toBe(15);
      expect(policy.halfDayAfterHours).toBe(4);
      expect(policy.minimumWorkingHours).toBe(8);
      expect(policy.overtimeStartsAfterHours).toBe(9);
      expect(policy.autoApproveGeofence).toBe(false);
    });

    it('throws ConflictError if creating a second default policy in the same organization', async () => {
      await AttendancePolicyService.createPolicy({ name: 'First Default', isDefault: true }, actor, orgId);

      await expect(
        AttendancePolicyService.createPolicy({ name: 'Second Default', isDefault: true }, actor, orgId)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('updatePolicy', () => {
    it('updates an active attendance policy successfully', async () => {
      const policy = await AttendancePolicyService.createPolicy({ name: 'Initial Name', lateAfterMinutes: 10 }, actor, orgId);
      const auditSpy = vi.spyOn(AuditService, 'logAction').mockResolvedValue(true);
      auditSpy.mockClear();

      const updated = await AttendancePolicyService.updatePolicy(policy._id, { name: 'Updated Name', lateAfterMinutes: 20 }, actor, orgId);
      expect(updated.name).toBe('Updated Name');
      expect(updated.lateAfterMinutes).toBe(20);

      expect(auditSpy).toHaveBeenCalledTimes(1);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          action: 'UPDATE_ATTENDANCE_POLICY',
          entityId: policy._id,
          previousValue: { name: 'Initial Name' },
          newValue: { name: 'Updated Name' }
        }),
        expect.any(Object)
      );
    });

    it('throws NotFoundError if updating non-existent policy', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        AttendancePolicyService.updatePolicy(fakeId, { name: 'New' }, actor, orgId)
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ValidationError if attempting to update an ARCHIVED policy', async () => {
      const policy = await AttendancePolicyService.createPolicy({ name: 'To Archive' }, actor, orgId);
      await AttendancePolicyRepository.updateByIdAndTenant(policy._id, { status: 'ARCHIVED' }, orgId);

      await expect(
        AttendancePolicyService.updatePolicy(policy._id, { name: 'Archived Edit' }, actor, orgId)
      ).rejects.toThrow(ValidationError);
    });

    it('throws ConflictError if setting isDefault=true when another default already exists', async () => {
      const defaultPolicy = await AttendancePolicyService.createPolicy({ name: 'Default 1', isDefault: true }, actor, orgId);
      const secondPolicy = await AttendancePolicyService.createPolicy({ name: 'Regular Policy', isDefault: false }, actor, orgId);

      await expect(
        AttendancePolicyService.updatePolicy(secondPolicy._id, { isDefault: true }, actor, orgId)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getPolicies & getPolicyById', () => {
    it('retrieves paginated list of policies for the organization', async () => {
      await AttendancePolicyService.createPolicy({ name: 'Policy A' }, actor, orgId);
      await AttendancePolicyService.createPolicy({ name: 'Policy B' }, actor, orgId);

      const result = await AttendancePolicyService.getPolicies({}, orgId, { page: 1, limit: 10 });
      expect(result.data.length).toBeGreaterThanOrEqual(2);
      expect(result.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it('retrieves specific policy by ID or throws NotFoundError', async () => {
      const created = await AttendancePolicyService.createPolicy({ name: 'Get Me' }, actor, orgId);
      const found = await AttendancePolicyService.getPolicyById(created._id, orgId);
      expect(found._id.toString()).toBe(created._id.toString());

      await expect(
        AttendancePolicyService.getPolicyById(new mongoose.Types.ObjectId(), orgId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('resolveForLocation & resolveForLocationObject hierarchy', () => {
    it('returns Level 1 location-specific policy when location has active attendancePolicyId', async () => {
      const locPolicy = await AttendancePolicyService.createPolicy({ name: 'Loc Policy', lateAfterMinutes: 5 }, actor, orgId);
      const location = await LocationRepository.createScoped({
        name: 'HQ', code: 'LOC-HQ', timezone: 'UTC', address: '123 Main St', attendancePolicyId: locPolicy._id
      }, orgId);

      const resolved = await AttendancePolicyService.resolveForLocation(location._id, orgId);
      expect(resolved.lateAfterMinutes).toBe(5);
    });

    it('returns Level 2 organization default policy when location has no specific policy assigned', async () => {
      await AttendancePolicyService.createPolicy({ name: 'Org Default', isDefault: true, lateAfterMinutes: 30 }, actor, orgId);
      const location = await LocationRepository.createScoped({
        name: 'Branch', code: 'LOC-BR', timezone: 'UTC', address: '456 Branch St'
      }, orgId);

      const resolved = await AttendancePolicyService.resolveForLocationObject(location, orgId);
      expect(resolved.lateAfterMinutes).toBe(30);
    });

    it('returns Level 3 system defaults when neither location nor organization default policy exists', async () => {
      const location = await LocationRepository.createScoped({
        name: 'Remote', code: 'LOC-REM', timezone: 'UTC', address: '789 Remote St'
      }, orgId);

      const resolved = await AttendancePolicyService.resolveForLocationObject(location, orgId);
      expect(resolved.lateAfterMinutes).toBe(15);
      expect(resolved.minimumWorkingHours).toBe(8);
      expect(resolved.overtimeStartsAfterHours).toBe(9);
    });

    it('throws NotFoundError if resolveForLocation is called with a non-existent locationId', async () => {
      await expect(
        AttendancePolicyService.resolveForLocation(new mongoose.Types.ObjectId(), orgId)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
