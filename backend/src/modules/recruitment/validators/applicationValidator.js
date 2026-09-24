import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId',
});

export const getApplicationByIdSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const getApplicationsForRequisitionSchema = z.object({
  params: z.object({
    requisitionId: objectIdSchema
  })
});

export const advanceStageSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    nextStageId: objectIdSchema.optional(),
    comments: z.string().optional()
  })
});

export const downloadDocumentSchema = z.object({
  params: z.object({
    id: objectIdSchema,
    documentId: objectIdSchema
  })
});

export const applyJobSchema = z.object({
  params: z.object({
    slugOrId: z.string().min(1, 'slugOrId is required')
  }),
  // Body parsing for multipart form is handled separately, but we could validate candidateId here
  body: z.object({
    candidateId: objectIdSchema.optional()
  }).passthrough()
});

export const rejectApplicationSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    reason: z.string().optional()
  })
});
