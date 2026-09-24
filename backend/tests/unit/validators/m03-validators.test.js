import { describe, it, expect } from 'vitest';
import {
  createEmployeeSchema,
  updateProfileSchema,
  changeStatusSchema,
  changeManagerSchema,
  inviteEmployeeSchema,
  archiveEmployeeSchema,
  employeeIdParamSchema
} from '#@/modules/employees/validators/employeeSchemas.js';

const VALID_OID = '5f8d0d55b54764421b7156c1';

const VALID_PAYLOAD = {
  employeeCode: 'EMP-001',
  firstName: 'John',
  lastName: 'Doe',
  departmentId: VALID_OID,
  designationId: VALID_OID,
  locationId: VALID_OID,
  shiftId: VALID_OID,
  joiningDate: new Date().toISOString()
};

describe('M-03 Employee Validator Tests', () => {

  // ---- createEmployeeSchema ----
  describe('createEmployeeSchema', () => {
    it('accepts a valid minimum payload', () => {
      const res = createEmployeeSchema.safeParse({ body: VALID_PAYLOAD });
      expect(res.success).toBe(true);
    });

    it('accepts a valid maximum payload with all optional fields', () => {
      const res = createEmployeeSchema.safeParse({
        body: {
          ...VALID_PAYLOAD,
          workEmail: 'john.doe@example.com',
          managerId: VALID_OID,
          metadata: { badge: 'blue', level: 3 }
        }
      });
      expect(res.success).toBe(true);
    });

    it('accepts nullable managerId', () => {
      const res = createEmployeeSchema.safeParse({
        body: { ...VALID_PAYLOAD, managerId: null }
      });
      expect(res.success).toBe(true);
    });

    it('rejects missing required fields', () => {
      expect(createEmployeeSchema.safeParse({}).success).toBe(false);
      expect(createEmployeeSchema.safeParse({ body: {} }).success).toBe(false);
      expect(createEmployeeSchema.safeParse({ body: { employeeCode: 'EMP' } }).success).toBe(false);
    });

    it('rejects missing departmentId', () => {
      const { departmentId: _, ...rest } = VALID_PAYLOAD;
      expect(createEmployeeSchema.safeParse({ body: rest }).success).toBe(false);
    });

    it('rejects invalid ObjectId format', () => {
      const res = createEmployeeSchema.safeParse({
        body: { ...VALID_PAYLOAD, departmentId: 'not-an-objectid' }
      });
      expect(res.success).toBe(false);
    });

    it('rejects invalid workEmail', () => {
      const res = createEmployeeSchema.safeParse({
        body: { ...VALID_PAYLOAD, workEmail: 'not-an-email' }
      });
      expect(res.success).toBe(false);
    });

    it('rejects invalid joiningDate', () => {
      const res = createEmployeeSchema.safeParse({
        body: { ...VALID_PAYLOAD, joiningDate: 'not-a-date' }
      });
      expect(res.success).toBe(false);
    });

    it('rejects empty employeeCode', () => {
      const res = createEmployeeSchema.safeParse({
        body: { ...VALID_PAYLOAD, employeeCode: '' }
      });
      expect(res.success).toBe(false);
    });

    it('rejects employeeCode exceeding max length', () => {
      const res = createEmployeeSchema.safeParse({
        body: { ...VALID_PAYLOAD, employeeCode: 'E'.repeat(31) }
      });
      expect(res.success).toBe(false);
    });
  });

  // ---- updateProfileSchema ----
  describe('updateProfileSchema (.strict() blocks structural fields)', () => {
    it('accepts valid profile fields', () => {
      const res = updateProfileSchema.safeParse({
        params: { id: VALID_OID },
        body: { firstName: 'Jane', lastName: 'Smith', workEmail: 'jane@example.com' }
      });
      expect(res.success).toBe(true);
    });

    it('accepts only metadata', () => {
      const res = updateProfileSchema.safeParse({
        params: { id: VALID_OID },
        body: { metadata: { key: 'value' } }
      });
      expect(res.success).toBe(true);
    });

    it('accepts empty body (no-op update)', () => {
      const res = updateProfileSchema.safeParse({
        params: { id: VALID_OID },
        body: {}
      });
      expect(res.success).toBe(true);
    });

    it('rejects structural field: departmentId', () => {
      const res = updateProfileSchema.safeParse({
        params: { id: VALID_OID },
        body: { firstName: 'Jane', departmentId: VALID_OID }
      });
      expect(res.success).toBe(false);
    });

    it('rejects structural field: managerId', () => {
      const res = updateProfileSchema.safeParse({
        params: { id: VALID_OID },
        body: { managerId: VALID_OID }
      });
      expect(res.success).toBe(false);
    });

    it('rejects structural field: status', () => {
      const res = updateProfileSchema.safeParse({
        params: { id: VALID_OID },
        body: { status: 'ACTIVE' }
      });
      expect(res.success).toBe(false);
    });

    it('rejects structural field: designationId', () => {
      const res = updateProfileSchema.safeParse({
        params: { id: VALID_OID },
        body: { designationId: VALID_OID }
      });
      expect(res.success).toBe(false);
    });

    it('rejects invalid workEmail in profile update', () => {
      const res = updateProfileSchema.safeParse({
        params: { id: VALID_OID },
        body: { workEmail: 'not-an-email' }
      });
      expect(res.success).toBe(false);
    });

    it('rejects missing params id', () => {
      const res = updateProfileSchema.safeParse({
        params: {},
        body: { firstName: 'Jane' }
      });
      expect(res.success).toBe(false);
    });
  });

  // ---- changeStatusSchema ----
  describe('changeStatusSchema', () => {
    it('accepts all valid status values', () => {
      const statuses = ['ONBOARDING', 'INVITED', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED'];
      for (const status of statuses) {
        const res = changeStatusSchema.safeParse({ params: { id: VALID_OID }, body: { status } });
        expect(res.success).toBe(true);
      }
    });

    it('accepts optional reason', () => {
      const res = changeStatusSchema.safeParse({
        params: { id: VALID_OID },
        body: { status: 'SUSPENDED', reason: 'Misconduct investigation' }
      });
      expect(res.success).toBe(true);
    });

    it('rejects invalid status enum', () => {
      const res = changeStatusSchema.safeParse({
        params: { id: VALID_OID },
        body: { status: 'ARCHIVED' }
      });
      expect(res.success).toBe(false);
    });

    it('rejects missing status', () => {
      const res = changeStatusSchema.safeParse({
        params: { id: VALID_OID },
        body: {}
      });
      expect(res.success).toBe(false);
    });
  });

  // ---- changeManagerSchema ----
  describe('changeManagerSchema', () => {
    it('accepts a valid managerId', () => {
      const res = changeManagerSchema.safeParse({
        params: { id: VALID_OID },
        body: { managerId: VALID_OID }
      });
      expect(res.success).toBe(true);
    });

    it('accepts null managerId (remove manager)', () => {
      const res = changeManagerSchema.safeParse({
        params: { id: VALID_OID },
        body: { managerId: null }
      });
      expect(res.success).toBe(true);
    });

    it('rejects invalid managerId format', () => {
      const res = changeManagerSchema.safeParse({
        params: { id: VALID_OID },
        body: { managerId: 'invalid-id' }
      });
      expect(res.success).toBe(false);
    });
  });

  // ---- inviteEmployeeSchema ----
  describe('inviteEmployeeSchema', () => {
    it('accepts valid roleIds array', () => {
      const res = inviteEmployeeSchema.safeParse({
        params: { id: VALID_OID },
        body: { roleIds: [VALID_OID] }
      });
      expect(res.success).toBe(true);
    });

    it('rejects empty roleIds array', () => {
      const res = inviteEmployeeSchema.safeParse({
        params: { id: VALID_OID },
        body: { roleIds: [] }
      });
      expect(res.success).toBe(false);
    });

    it('rejects invalid ObjectId in roleIds', () => {
      const res = inviteEmployeeSchema.safeParse({
        params: { id: VALID_OID },
        body: { roleIds: ['not-an-id'] }
      });
      expect(res.success).toBe(false);
    });
  });

  // ---- archiveEmployeeSchema ----
  describe('archiveEmployeeSchema', () => {
    it('accepts valid id and reason', () => {
      const res = archiveEmployeeSchema.safeParse({
        params: { id: VALID_OID },
        body: { reason: 'End of contract' }
      });
      expect(res.success).toBe(true);
    });

    it('accepts missing body (reason is optional)', () => {
      const res = archiveEmployeeSchema.safeParse({
        params: { id: VALID_OID }
      });
      expect(res.success).toBe(true);
    });

    it('rejects invalid params id', () => {
      const res = archiveEmployeeSchema.safeParse({
        params: { id: 'bad-id' }
      });
      expect(res.success).toBe(false);
    });
  });

  // ---- employeeIdParamSchema ----
  describe('employeeIdParamSchema', () => {
    it('accepts valid ObjectId', () => {
      expect(employeeIdParamSchema.safeParse({ params: { id: VALID_OID } }).success).toBe(true);
    });

    it('rejects invalid ObjectId', () => {
      expect(employeeIdParamSchema.safeParse({ params: { id: 'bad' } }).success).toBe(false);
    });

    it('rejects missing id', () => {
      expect(employeeIdParamSchema.safeParse({ params: {} }).success).toBe(false);
    });
  });
});
