import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createDepartmentSchema = z.object({
  body: z.object({
    code: z.string()
      .min(1, 'Department code is required.')
      .max(20, 'Department code must not exceed 20 characters.')
      .regex(/^[A-Z0-9_-]+$/, 'Department code must be uppercase and alphanumeric (hyphens/underscores allowed).'),
    name: z.string()
      .min(2, 'Department name must be at least 2 characters.')
      .max(100, 'Department name must not exceed 100 characters.'),
    description: z.string().max(500, 'Description must not exceed 500 characters.').optional(),
    parentDepartmentId: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId for parentDepartmentId.').nullable().optional(),
    managerUserId: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId for managerUserId.').nullable().optional()
  })
});

export const updateDepartmentSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId for department.')
  }),
  body: z.object({
    code: z.string().min(1).max(20).regex(/^[A-Z0-9_-]+$/).optional(),
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    parentDepartmentId: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId for parentDepartmentId.').nullable().optional(),
    managerUserId: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId for managerUserId.').nullable().optional()
  })
});

export const moveDepartmentSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId for department.')
  }),
  body: z.object({
    parentDepartmentId: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId for parentDepartmentId.').nullable()
  })
});

export const archiveDepartmentSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId for department.')
  }),
  body: z.object({
    reason: z.string().max(255, 'Reason must not exceed 255 characters.').optional()
  }).optional()
});

export const getDepartmentByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId for department.')
  })
});

export default {
  createDepartmentSchema,
  updateDepartmentSchema,
  moveDepartmentSchema,
  archiveDepartmentSchema,
  getDepartmentByIdSchema
};
