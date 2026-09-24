import { describe, it, expect } from 'vitest';
import { createDesignationSchema, updateDesignationSchema } from '#@/modules/organization/validators/designationSchemas.js';
import { createLocationSchema, updateLocationSchema } from '#@/modules/organization/validators/locationSchemas.js';
import { createShiftSchema, updateShiftSchema } from '#@/modules/organization/validators/shiftSchemas.js';
import { createOrUpdateHolidayCalendarSchema } from '#@/modules/organization/validators/holidaySchemas.js';

describe('Exhaustive Validation Verification - Module M-02', () => {

  describe('Designation Validation', () => {
    it('Valid minimum payload', () => {
      const res = createDesignationSchema.safeParse({ body: { code: 'D', title: 'AA' } });
      expect(res.success).toBe(true);
    });

    it('Valid maximum payload', () => {
      const res = createDesignationSchema.safeParse({ 
        body: { 
          code: 'MAXIMUM_CODE_LENGTH', 
          title: 'a'.repeat(100),
          description: 'd'.repeat(500),
          salaryGrade: 'g'.repeat(50),
          payBand: { min: 1000, max: 200000 },
          defaultDepartmentId: '5f8d0d55b54764421b7156c1'
        } 
      });
      expect(res.success).toBe(true);
    });

    it('Rejects missing required fields and empty bodies', () => {
      expect(createDesignationSchema.safeParse({}).success).toBe(false);
      expect(createDesignationSchema.safeParse({ body: {} }).success).toBe(false);
      expect(createDesignationSchema.safeParse({ body: { code: 'A' } }).success).toBe(false);
    });

    it('Rejects undefined and null values where prohibited', () => {
      expect(createDesignationSchema.safeParse({ body: { code: null, title: undefined } }).success).toBe(false);
    });

    it('Rejects boundary value violations', () => {
      // Code too long
      expect(createDesignationSchema.safeParse({ body: { code: 'A'.repeat(21), title: 'A' } }).success).toBe(false);
      // Title too short
      expect(createDesignationSchema.safeParse({ body: { code: 'A', title: '1' } }).success).toBe(false);
    });

    it('Rejects unknown fields (strict mode)', () => {
      const res = createDesignationSchema.safeParse({ body: { code: 'A', title: 'A', malicious: true } });
      // We expect strict mode to fail on unknown fields or strip them. For security, we verify it strips or fails.
      if (res.success) {
        expect(res.data.body).not.toHaveProperty('malicious');
      } else {
        expect(res.success).toBe(false);
      }
    });

    it('Rejects invalid ObjectIds', () => {
      expect(createDesignationSchema.safeParse({ body: { code: 'A', title: 'A', defaultDepartmentId: 'invalid' } }).success).toBe(false);
    });

    it('Rejects NoSQL injection attempts in regex restricted fields', () => {
      expect(createDesignationSchema.safeParse({ body: { code: '{$gt:""}', title: 'A' } }).success).toBe(false);
    });
  });

  describe('Location Validation', () => {
    it('Valid minimum and maximum payloads', () => {
      expect(createLocationSchema.safeParse({ body: { code: 'L', name: 'NY', address: '12345', timezone: 'America/New_York' } }).success).toBe(true);
      expect(createLocationSchema.safeParse({ body: { 
        code: 'MAX', name: 'a'.repeat(100), address: 'a'.repeat(500), 
        timezone: 'Asia/Kolkata', coordinates: { latitude: 90, longitude: 180 }, geofenceRadiusMeters: 1000 
      } }).success).toBe(true);
    });

    it('Rejects coordinate boundaries', () => {
      expect(createLocationSchema.safeParse({ body: { code: 'L', name: 'NY', address: '12345', timezone: 'UTC', coordinates: { latitude: 91, longitude: 0 } } }).success).toBe(false);
      expect(createLocationSchema.safeParse({ body: { code: 'L', name: 'NY', address: '12345', timezone: 'UTC', coordinates: { latitude: 0, longitude: -181 } } }).success).toBe(false);
    });
  });

  describe('Shift Validation', () => {
    it('Rejects invalid time format', () => {
      expect(createShiftSchema.safeParse({ body: { code: 'S', name: 'S', startTime: '25:00', endTime: '10:00' } }).success).toBe(false);
      expect(createShiftSchema.safeParse({ body: { code: 'S', name: 'S', startTime: '10:60', endTime: '10:00' } }).success).toBe(false);
    });

    it('Valid time format', () => {
      expect(createShiftSchema.safeParse({ body: { code: 'S', name: 'SS', startTime: '09:00', endTime: '17:30' } }).success).toBe(true);
    });
  });

  describe('Holiday Calendar Validation', () => {
    it('Valid holiday payload', () => {
      expect(createOrUpdateHolidayCalendarSchema.safeParse({
        params: { locationId: '5f8d0d55b54764421b7156c1', year: '2026' },
        body: { holidays: [{ name: 'New Year', date: '2026-01-01', type: 'MANDATORY' }] }
      }).success).toBe(true);
    });

    it('Rejects invalid year or location ID', () => {
      expect(createOrUpdateHolidayCalendarSchema.safeParse({
        params: { locationId: '123', year: '2026' }, body: { holidays: [] }
      }).success).toBe(false);
      expect(createOrUpdateHolidayCalendarSchema.safeParse({
        params: { locationId: '5f8d0d55b54764421b7156c1', year: '202' }, body: { holidays: [] }
      }).success).toBe(false);
    });

    it('Rejects invalid enum', () => {
      expect(createOrUpdateHolidayCalendarSchema.safeParse({
        params: { locationId: '5f8d0d55b54764421b7156c1', year: '2026' },
        body: { holidays: [{ name: 'New Year', date: '2026-01-01', type: 'INVALID' }] }
      }).success).toBe(false);
    });
  });

});
