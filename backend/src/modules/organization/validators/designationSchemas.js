import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createDesignationSchema = z.object({
  body: z.object({
    code: z.string()
      .min(1, 'Code is required.')
      .max(20, 'Code must not exceed 20 characters.')
      .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase and alphanumeric (hyphens/underscores allowed).'),
    title: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    salaryGrade: z.string().max(50).optional(),
    payBand: z.object({
      min: z.number().min(0),
      max: z.number().min(0)
    }).optional().refine(data => !data || data.max >= data.min, {
      message: 'payBand max must be greater than or equal to min',
      path: ['payBand', 'max']
    }),
    defaultDepartmentId: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId.').nullable().optional()
  })
});

export const updateDesignationSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId.')
  }),
  body: z.object({
    code: z.string().min(1).max(20).regex(/^[A-Z0-9_-]+$/).optional(),
    title: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    salaryGrade: z.string().max(50).optional(),
    payBand: z.object({
      min: z.number().min(0),
      max: z.number().min(0)
    }).optional().refine(data => !data || data.max >= data.min, {
      message: 'payBand max must be greater than or equal to min',
      path: ['payBand', 'max']
    }),
    defaultDepartmentId: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId.').nullable().optional()
  })
});

export const archiveDesignationSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId.')
  }),
  body: z.object({
    reason: z.string().max(255).optional()
  }).optional()
});

export const getDesignationByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId.')
  })
});

export default {
  createDesignationSchema,
  updateDesignationSchema,
  archiveDesignationSchema,
  getDesignationByIdSchema
};
