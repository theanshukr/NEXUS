import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// ── GPS / Device Schemas ──────────────────────────────────────────────────────

const gpsDataSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  gpsAccuracyMeters: z.number().min(0).optional().default(0),
  // Client reports why GPS failed (e.g., user denied permission).
  geofenceFailureReason: z
    .enum(['LOCATION_DISABLED', 'LOCATION_PERMISSION_DENIED', 'LOCATION_TIMEOUT'])
    .nullable()
    .optional()
    .default(null)
});

const deviceDataSchema = z.object({
  browser: z.string().max(100).optional(),
  userAgent: z.string().max(500).optional(),
  ip: z.string().max(50).optional(),
  platform: z.string().max(100).optional(),
  deviceId: z.string().max(255).optional()
}).optional();

// ── Clock In / Out ────────────────────────────────────────────────────────────

export const clockInSchema = z.object({
  body: z.object({
    gpsData: gpsDataSchema,
    deviceData: deviceDataSchema
  })
});

export const clockOutSchema = z.object({
  body: z.object({
    gpsData: gpsDataSchema,
    deviceData: deviceDataSchema
  })
});

// ── Query Schemas ─────────────────────────────────────────────────────────────

export const getAttendanceByEmployeeIdSchema = z.object({
  params: z.object({
    employeeId: z.string().regex(objectIdRegex, 'Invalid employee ID')
  }),
  query: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional()
  })
});

// ── AttendancePolicy Schemas ──────────────────────────────────────────────────

export const createAttendancePolicySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    isDefault: z.boolean().optional().default(false),
    lateAfterMinutes: z.number().min(0).max(120).optional(),
    halfDayAfterHours: z.number().min(0).max(12).optional(),
    minimumWorkingHours: z.number().min(1).max(24).optional(),
    overtimeStartsAfterHours: z.number().min(1).max(24).optional(),
    autoApproveGeofence: z.boolean().optional()
  })
});

export const updateAttendancePolicySchema = z.object({
  params: z.object({ id: z.string().regex(objectIdRegex, 'Invalid policy ID') }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    isDefault: z.boolean().optional(),
    lateAfterMinutes: z.number().min(0).max(120).optional(),
    halfDayAfterHours: z.number().min(0).max(12).optional(),
    minimumWorkingHours: z.number().min(1).max(24).optional(),
    overtimeStartsAfterHours: z.number().min(1).max(24).optional(),
    autoApproveGeofence: z.boolean().optional()
  })
});

export const getPolicyByIdSchema = z.object({
  params: z.object({ id: z.string().regex(objectIdRegex, 'Invalid policy ID') })
});

export const finalizePayPeriodSchema = z.object({
  body: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in YYYY-MM-DD format')
  })
});
