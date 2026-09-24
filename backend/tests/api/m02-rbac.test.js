import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

import designationRoutes from '#@/modules/organization/routes/designationRoutes.js';
import locationRoutes from '#@/modules/organization/routes/locationRoutes.js';
import shiftRoutes from '#@/modules/organization/routes/shiftRoutes.js';
import holidayRoutes from '#@/modules/organization/routes/holidayRoutes.js';

import PERMISSIONS from '#@/core/constants/permissions/index.js';

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  // Inject mock user
  req.user = { 
    userId: 'u1', 
    organizationId: 'org1', 
    permissions: req.headers['x-mock-perms'] ? req.headers['x-mock-perms'].split(',') : []
  };
  next();
});

vi.mock('#@/core/middleware/hasPermission.js', () => {
  const mockFn = (requiredPerm) => (req, res, next) => {
    // If the required permission matches exactly what's passed, or if the user has the wildcard '*', allow.
    if (req.user.permissions.includes(requiredPerm) || req.user.permissions.includes('*')) {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Forbidden' });
  };
  return {
    __esModule: true,
    default: mockFn,
    hasPermission: mockFn,
    hasAnyPermission: mockFn,
    hasAllPermissions: mockFn
  };
});

vi.mock('#@/core/middleware/auth.js', () => ({ default: (req, res, next) => next() }));
vi.mock('#@/core/middleware/tenant.js', () => ({ default: (req, res, next) => next() }));
vi.mock('#@/core/middleware/validator.js', () => ({ default: () => (req, res, next) => next() }));

vi.mock('#@/modules/organization/controllers/DesignationController.js', () => ({
  default: { 
    createDesignation: (req, res) => res.status(201).json({ success: true }), 
    getDesignations: (req, res) => res.status(200).json({ success: true }), 
    getDesignationById: (req, res) => res.status(200).json({ success: true }), 
    updateDesignation: (req, res) => res.status(200).json({ success: true }), 
    archiveDesignation: (req, res) => res.status(200).json({ success: true }) 
  }
}));
vi.mock('#@/modules/organization/controllers/LocationController.js', () => ({
  default: { 
    createLocation: (req, res) => res.status(201).json({ success: true }), 
    getLocations: (req, res) => res.status(200).json({ success: true }), 
    getLocationById: (req, res) => res.status(200).json({ success: true }), 
    updateLocation: (req, res) => res.status(200).json({ success: true }), 
    archiveLocation: (req, res) => res.status(200).json({ success: true }) 
  }
}));
vi.mock('#@/modules/organization/controllers/ShiftController.js', () => ({
  default: { 
    createShift: (req, res) => res.status(201).json({ success: true }), 
    getShifts: (req, res) => res.status(200).json({ success: true }), 
    getShiftById: (req, res) => res.status(200).json({ success: true }), 
    updateShift: (req, res) => res.status(200).json({ success: true }), 
    archiveShift: (req, res) => res.status(200).json({ success: true }) 
  }
}));
vi.mock('#@/modules/organization/controllers/HolidayCalendarController.js', () => ({
  default: { 
    createOrUpdateHolidayCalendar: (req, res) => res.status(200).json({ success: true }), 
    getHolidayCalendar: (req, res) => res.status(200).json({ success: true }) 
  }
}));

app.use('/api/v1/designations', designationRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/shifts', shiftRoutes);
app.use('/api/v1/locations', holidayRoutes); // Holidays are mounted on /locations/:locationId/holidays

describe('Exhaustive RBAC & API Contract Verification - Module M-02', () => {

  const testMatrix = [
    {
      module: 'Designations',
      endpoints: [
        { method: 'get', url: '/api/v1/designations', perm: PERMISSIONS.DESIGNATION.READ, expected: 200 },
        { method: 'post', url: '/api/v1/designations', perm: PERMISSIONS.DESIGNATION.CREATE, expected: 201 },
        { method: 'patch', url: '/api/v1/designations/id1', perm: PERMISSIONS.DESIGNATION.UPDATE, expected: 200 },
        { method: 'post', url: '/api/v1/designations/id1/archive', perm: PERMISSIONS.DESIGNATION.ARCHIVE, expected: 200 },
      ]
    },
    {
      module: 'Locations',
      endpoints: [
        { method: 'get', url: '/api/v1/locations', perm: PERMISSIONS.LOCATION.READ, expected: 200 },
        { method: 'post', url: '/api/v1/locations', perm: PERMISSIONS.LOCATION.CREATE, expected: 201 },
        { method: 'patch', url: '/api/v1/locations/id1', perm: PERMISSIONS.LOCATION.UPDATE, expected: 200 },
        { method: 'post', url: '/api/v1/locations/id1/archive', perm: PERMISSIONS.LOCATION.ARCHIVE, expected: 200 },
      ]
    },
    {
      module: 'Shifts',
      endpoints: [
        { method: 'get', url: '/api/v1/shifts', perm: PERMISSIONS.SHIFT.READ, expected: 200 },
        { method: 'post', url: '/api/v1/shifts', perm: PERMISSIONS.SHIFT.CREATE, expected: 201 },
        { method: 'patch', url: '/api/v1/shifts/id1', perm: PERMISSIONS.SHIFT.UPDATE, expected: 200 },
        { method: 'post', url: '/api/v1/shifts/id1/archive', perm: PERMISSIONS.SHIFT.ARCHIVE, expected: 200 },
      ]
    },
    {
      module: 'HolidayCalendars',
      endpoints: [
        { method: 'get', url: '/api/v1/locations/loc1/holidays/2026', perm: PERMISSIONS.HOLIDAY.READ, expected: 200 },
        { method: 'put', url: '/api/v1/locations/loc1/holidays/2026', perm: PERMISSIONS.HOLIDAY.UPDATE, expected: 200 },
      ]
    }
  ];

  testMatrix.forEach(({ module, endpoints }) => {
    describe(`${module} RBAC`, () => {
      endpoints.forEach(({ method, url, perm, expected }) => {
        it(`User with ${perm} can access ${method.toUpperCase()} ${url}`, async () => {
          const res = await request(app)[method](url).set('x-mock-perms', perm);
          expect(res.status).toBe(expected);
          expect(res.body.success).toBe(true); // Contract check
        });

        it(`User with Super Admin '*' can access ${method.toUpperCase()} ${url}`, async () => {
          const res = await request(app)[method](url).set('x-mock-perms', '*');
          expect(res.status).toBe(expected);
        });

        it(`User WITHOUT permissions gets 403 on ${method.toUpperCase()} ${url}`, async () => {
          const res = await request(app)[method](url).set('x-mock-perms', 'other.perm');
          expect(res.status).toBe(403);
          expect(res.body.success).toBe(false); // Contract check
          expect(res.body.message).toBe('Forbidden'); // Contract check
        });
      });
    });
  });

});
