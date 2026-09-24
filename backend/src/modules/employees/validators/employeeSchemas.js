import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectId = z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId.');

// ---------------------------------------------------------------------------
// CREATE EMPLOYEE
// ---------------------------------------------------------------------------
export const createEmployeeSchema = z.object({
  body: z.object({
    employeeCode: z
      .string()
      .min(1, 'Employee code is required.')
      .max(30, 'Employee code must not exceed 30 characters.')
      .trim(),
    firstName: z.string().min(1, 'First name is required.').max(100),
    lastName: z.string().min(1, 'Last name is required.').max(100),
    workEmail: z.string().email('Invalid email address.').max(255).optional().nullable(),
    departmentId: objectId,
    designationId: objectId,
    locationId: objectId,
    shiftId: objectId,
    managerId: objectId.nullable().optional(),
    joiningDate: z.string().datetime({ message: 'joiningDate must be a valid ISO date.' }),
    metadata: z.record(z.unknown()).optional()
  })
});

// ---------------------------------------------------------------------------
// UPDATE PROFILE (PATCH /employees/:id/profile)
// Strictly limited to editable profile fields only.
// Structural fields (departmentId, designationId, locationId, shiftId, managerId, status)
// are explicitly forbidden through schema strictness and endpoint separation.
// ---------------------------------------------------------------------------
export const updateProfileSchema = z.object({
  params: z.object({
    id: objectId
  }),
  body: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    workEmail: z.string().email('Invalid email address.').max(255).nullable().optional(),
    metadata: z.record(z.unknown()).optional()
  }).strict() // Rejects any unknown/forbidden fields at the schema boundary
});

// ---------------------------------------------------------------------------
// CHANGE STATUS (PUT /employees/:id/status)
// ---------------------------------------------------------------------------
export const changeStatusSchema = z.object({
  params: z.object({
    id: objectId
  }),
  body: z.object({
    status: z.enum(
      ['ONBOARDING', 'INVITED', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED'],
      { errorMap: () => ({ message: 'Invalid employee status.' }) }
    ),
    reason: z.string().max(500).optional()
  })
});

// ---------------------------------------------------------------------------
// CHANGE MANAGER (PUT /employees/:id/manager)
// ---------------------------------------------------------------------------
export const changeManagerSchema = z.object({
  params: z.object({
    id: objectId
  }),
  body: z.object({
    managerId: objectId.nullable()
  })
});

// ---------------------------------------------------------------------------
// INVITE EMPLOYEE (POST /employees/:id/invite)
// ---------------------------------------------------------------------------
export const inviteEmployeeSchema = z.object({
  params: z.object({
    id: objectId
  }),
  body: z.object({
    roleIds: z
      .array(objectId)
      .min(1, 'At least one role must be specified.')
  })
});

// ---------------------------------------------------------------------------
// ARCHIVE EMPLOYEE (POST /employees/:id/archive)
// ---------------------------------------------------------------------------
export const archiveEmployeeSchema = z.object({
  params: z.object({
    id: objectId
  }),
  body: z.object({
    reason: z.string().max(500).optional()
  }).optional()
});

// ---------------------------------------------------------------------------
// GET BY ID / RESTORE (params only)
// ---------------------------------------------------------------------------
export const employeeIdParamSchema = z.object({
  params: z.object({
    id: objectId
  })
});

export default {
  createEmployeeSchema,
  updateProfileSchema,
  changeStatusSchema,
  changeManagerSchema,
  inviteEmployeeSchema,
  archiveEmployeeSchema,
  employeeIdParamSchema
};
