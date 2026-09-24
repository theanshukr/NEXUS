import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const objectIdValidator = z.string().refine((val) => isValidObjectId(val), {
  message: 'Invalid ObjectId format'
});

export const createOfferSchema = z.object({
  body: z.object({
    salary: z.object({
      amount: z.number().positive(),
      currency: z.string().min(3).max(3),
      period: z.enum(['HOURLY', 'MONTHLY', 'YEARLY', 'LPA'])
    }),
    designationId: objectIdValidator,
    departmentId: objectIdValidator,
    joiningDate: z.string().datetime({ message: "Invalid ISO datetime string" }),
    offerExpiry: z.string().datetime({ message: "Invalid ISO datetime string" }),
    notes: z.string().optional()
  }).refine(data => new Date(data.offerExpiry) > new Date(), {
    message: "Offer expiry must be in the future",
    path: ["offerExpiry"]
  })
});
