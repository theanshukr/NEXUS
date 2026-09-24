import { z } from 'zod';
import { EMPLOYMENT_TYPE, WORK_MODE } from '#@/core/constants/employment.js';
import mongoose from 'mongoose';

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId',
});

export const customHiringStageSchema = z.object({
  name: z.string().min(1, 'Stage name is required'),
  type: z.enum(['SCREENING', 'INTERVIEW', 'ASSESSMENT', 'OFFER']),
  order: z.number().int().min(1),
  isRequired: z.boolean().default(true),
  aiEnabled: z.boolean().default(false),
  defaultEvaluatorRoles: z.array(objectIdSchema).optional(),
  scorecardTemplateId: objectIdSchema.optional().nullable()
});

export const technicalRequirementSchema = z.object({
  skillId: objectIdSchema.optional().nullable(),
  name: z.string().min(1, 'Skill name is required'),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
  mandatory: z.boolean().default(true),
  weight: z.number().min(0).max(100).default(0)
});

export const baseRequisitionPayloadSchema = z.object({
  departmentId: objectIdSchema,
  reportingManagerId: objectIdSchema,
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  location: z.string().min(1, 'Location is required'),
  employmentType: z.enum(Object.values(EMPLOYMENT_TYPE)),
  workMode: z.enum(Object.values(WORK_MODE)),
  minimumExperienceYears: z.number().min(0),
  maximumExperienceYears: z.number().min(0),
  technicalRequirements: z.array(technicalRequirementSchema).optional(),
  salary: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
    currency: z.string().length(3),
    period: z.enum(['HOURLY', 'MONTHLY', 'YEARLY', 'LPA'])
  }),
  openPositions: z.number().int().min(1),
  workflowTemplateId: objectIdSchema.optional().nullable(),
  customWorkflow: z.array(customHiringStageSchema).optional(),
  approvalWorkflowTemplateId: objectIdSchema.optional().nullable(),
  aiConfiguration: z.object({
    enabled: z.boolean().default(false),
    minimumResumeScore: z.number().min(0).max(100).default(0)
  }).optional(),
  applicationDeadline: z.string().datetime().optional().nullable() // ISO Date string
});

export const requisitionPayloadSchema = baseRequisitionPayloadSchema
.refine(data => data.maximumExperienceYears >= data.minimumExperienceYears, {
  message: 'Maximum experience must be greater than or equal to minimum experience',
  path: ['maximumExperienceYears']
})
.refine(data => data.salary.max >= data.salary.min, {
  message: 'Maximum salary must be greater than or equal to minimum salary',
  path: ['salary.max']
});

export const updateRequisitionPayloadSchema = baseRequisitionPayloadSchema.partial()
.refine(data => {
  if (data.maximumExperienceYears !== undefined && data.minimumExperienceYears !== undefined) {
    return data.maximumExperienceYears >= data.minimumExperienceYears;
  }
  return true;
}, {
  message: 'Maximum experience must be greater than or equal to minimum experience',
  path: ['maximumExperienceYears']
})
.refine(data => {
  if (data.salary && data.salary.max !== undefined && data.salary.min !== undefined) {
    return data.salary.max >= data.salary.min;
  }
  return true;
}, {
  message: 'Maximum salary must be greater than or equal to minimum salary',
  path: ['salary.max']
});

export const createRequisitionSchema = z.object({
  body: requisitionPayloadSchema
});

export const updateRequisitionSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: updateRequisitionPayloadSchema
});

export const getRequisitionByIdSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const rejectRequisitionSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    reason: z.string().optional()
  })
});
