import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const timezoneRegex = /^[A-Za-z_]+\/[A-Za-z_-]+$/;

export const createLocationSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(20).regex(/^[A-Z0-9_-]+$/),
    name: z.string().min(2).max(100),
    address: z.string().min(5).max(500),
    coordinates: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    }).optional(),
    geofenceRadiusMeters: z.number().min(10).optional(),
    timezone: z.string().regex(timezoneRegex, 'Must be a valid IANA timezone (e.g. Asia/Kolkata)')
  })
});

export const updateLocationSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId.')
  }),
  body: z.object({
    code: z.string().min(1).max(20).regex(/^[A-Z0-9_-]+$/).optional(),
    name: z.string().min(2).max(100).optional(),
    address: z.string().min(5).max(500).optional(),
    coordinates: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    }).optional(),
    geofenceRadiusMeters: z.number().min(10).optional(),
    timezone: z.string().regex(timezoneRegex).optional()
  })
});

export const archiveLocationSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId.')
  }),
  body: z.object({
    reason: z.string().max(255).optional()
  }).optional()
});

export const getLocationByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId.')
  })
});

export default {
  createLocationSchema,
  updateLocationSchema,
  archiveLocationSchema,
  getLocationByIdSchema
};
