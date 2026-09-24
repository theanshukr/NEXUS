import { describe, it, expect } from 'vitest';
import Designation from '#@/modules/organization/models/Designation.js';
import Location from '#@/modules/organization/models/Location.js';
import Shift from '#@/modules/organization/models/Shift.js';
import HolidayCalendar from '#@/modules/organization/models/HolidayCalendar.js';

describe('Architecture & Schema Verification - Module M-02', () => {
  describe('Designation Model', () => {
    it('must require organizationId', () => {
      const paths = Designation.schema.paths;
      expect(paths.organizationId).toBeDefined();
      expect(paths.organizationId.isRequired).toBe(true);
    });

    it('must have compound index on organizationId and code for uniqueness', () => {
      const indexes = Designation.schema.indexes();
      const uniqueIndex = indexes.find(i => i[0].organizationId === 1 && i[0].code === 1);
      expect(uniqueIndex).toBeDefined();
      expect(uniqueIndex[1].unique).toBe(true);
    });
  });

  describe('Location Model', () => {
    it('must require organizationId', () => {
      const paths = Location.schema.paths;
      expect(paths.organizationId).toBeDefined();
      expect(paths.organizationId.isRequired).toBe(true);
    });

    it('must have compound index on organizationId and code for uniqueness', () => {
      const indexes = Location.schema.indexes();
      const uniqueIndex = indexes.find(i => i[0].organizationId === 1 && i[0].code === 1);
      expect(uniqueIndex).toBeDefined();
      expect(uniqueIndex[1].unique).toBe(true);
    });
  });

  describe('Shift Model', () => {
    it('must require organizationId', () => {
      const paths = Shift.schema.paths;
      expect(paths.organizationId).toBeDefined();
      expect(paths.organizationId.isRequired).toBe(true);
    });

    it('must have compound index on organizationId and code for uniqueness', () => {
      const indexes = Shift.schema.indexes();
      const uniqueIndex = indexes.find(i => i[0].organizationId === 1 && i[0].code === 1);
      expect(uniqueIndex).toBeDefined();
      expect(uniqueIndex[1].unique).toBe(true);
    });
  });

  describe('HolidayCalendar Model', () => {
    it('must require organizationId and locationId', () => {
      const paths = HolidayCalendar.schema.paths;
      expect(paths.organizationId).toBeDefined();
      expect(paths.organizationId.isRequired).toBe(true);
      expect(paths.locationId).toBeDefined();
      expect(paths.locationId.isRequired).toBe(true);
    });

    it('must have compound index on organizationId, locationId, and year for uniqueness', () => {
      const indexes = HolidayCalendar.schema.indexes();
      const uniqueIndex = indexes.find(i => i[0].organizationId === 1 && i[0].locationId === 1 && i[0].year === 1);
      expect(uniqueIndex).toBeDefined();
      expect(uniqueIndex[1].unique).toBe(true);
    });
  });
});
