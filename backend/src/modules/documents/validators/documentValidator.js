import { z } from 'zod';
import { OWNER_TYPES, DOCUMENT_CATEGORIES } from '../models/Document.js';

/**
 * Validates metadata passed during document creation internally via DocumentService
 */
export const createDocumentMetadataSchema = z.object({
  category: z.enum(DOCUMENT_CATEGORIES, {
    errorMap: () => ({ message: 'Invalid document category.' })
  }),
  ownerType: z.enum(OWNER_TYPES, {
    errorMap: () => ({ message: 'Invalid owner type.' })
  }),
  ownerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId for ownerId.'),
  description: z.string().max(500).optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * Validates updates applied to existing documents internally via DocumentService
 */
export const updateDocumentMetadataSchema = z.object({
  category: z.enum(DOCUMENT_CATEGORIES).optional(),
  ownerType: z.enum(OWNER_TYPES).optional(),
  ownerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId for ownerId.').optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.any()).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'Update payload must contain at least one valid field.'
});

export default {
  createDocumentMetadataSchema,
  updateDocumentMetadataSchema
};
