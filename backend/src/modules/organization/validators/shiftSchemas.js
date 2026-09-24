import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const createShiftSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(20).regex(/^[A-Z0-9_-]+$/),
    name: z.string().min(2).max(100),
    startTime: z.string().regex(timeRegex, 'Must be in HH:mm format'),
    endTime: z.string().regex(timeRegex, 'Must be in HH:mm format'),
    gracePeriodMinutes: z.number().min(0).max(120).optional(),
    isNightShift: z.boolean().optional()
  })
});

export const updateShiftSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId.')
  }),
  body: z.object({
    code: z.string().min(1).max(20).regex(/^[A-Z0-9_-]+$/).optional(),
    name: z.string().min(2).max(100).optional(),
    startTime: z.string().regex(timeRegex).optional(),
    endTime: z.string().regex(timeRegex).optional(),
    gracePeriodMinutes: z.number().min(0).max(120).optional(),
    isNightShift: z.boolean().optional()
  })
});

export const archiveShiftSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId.')
  }),
  body: z.object({
    reason: z.string().max(255).optional()
  }).optional()
});

export const getShiftByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId.')
  })
});

export default {
  createShiftSchema,
  updateShiftSchema,
  archiveShiftSchema,
  getShiftByIdSchema
};
