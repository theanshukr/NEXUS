import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address format.'),
    password: z.string().min(1, 'Password is required.'),
    organizationCode: z.string().optional()
  })
});

export const registerViaInviteSchema = z.object({
  body: z.object({
    token: z.string().length(64, 'Invitation token must be exactly 64 hexadecimal characters.'),
    email: z.string().email('Invalid email address format.').optional(),
    password: z.string()
      .min(8, 'Password must be at least 8 characters long.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
      .regex(/[0-9]/, 'Password must contain at least one digit.')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character.'),
    firstName: z.string().min(2, 'First name must be at least 2 characters.'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters.')
  })
});

export const employeeSignupSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address format.'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters long.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
      .regex(/[0-9]/, 'Password must contain at least one digit.')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character.'),
    firstName: z.string().min(2, 'First name must be at least 2 characters.'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters.')
  })
});

export const createRoleSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Role name must be at least 2 characters.').max(50),
    description: z.string().max(255).optional(),
    priority: z.number().int().min(1, 'Priority must be between 1 and 100.').max(100),
    permissions: z.array(z.string().min(1)).min(1, 'A role must contain at least one permission.')
  })
});

export const updateRoleSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    description: z.string().max(255).optional(),
    priority: z.number().int().min(1).max(100).optional(),
    permissions: z.array(z.string().min(1)).min(1).optional()
  })
});

export const assignRoleSchema = z.object({
  body: z.object({
    targetUserId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId for user.'),
    roleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId for role.')
  })
});

export const createRoleDelegationPolicySchema = z.object({
  body: z.object({
    sourceRoleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId for source role.'),
    targetRoleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId for target role.')
  })
});

export const createInviteSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    roleIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId')).min(1, 'At least one default role ID is required.'),
    expiresInHours: z.number().int().min(1).max(720).default(48),
    maxUses: z.number().int().min(1).max(500).default(1)
  })
});

export const createOrganizationSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Organization name is required.'),
    code: z.string().min(2, 'Organization code is required.').max(10).toUpperCase(),
    domain: z.string().optional(),
    adminEmail: z.string().email('Admin email is required.'),
    adminPassword: z.string().min(8, 'Admin password must be at least 8 characters.'),
    adminFirstName: z.string().min(2),
    adminLastName: z.string().min(2)
  })
});

export default {
  loginSchema,
  registerViaInviteSchema,
  createRoleSchema,
  updateRoleSchema,
  assignRoleSchema,
  createInviteSchema,
  createOrganizationSchema,
  employeeSignupSchema
};
