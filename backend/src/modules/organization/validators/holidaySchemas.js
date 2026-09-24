import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createOrUpdateHolidayCalendarSchema = z.object({
  params: z.object({
    locationId: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId.'),
    year: z.string().regex(/^\d{4}$/, 'Year must be a 4 digit number')
  }),
  body: z.object({
    holidays: z.array(
      z.object({
        name: z.string().min(2).max(100),
        date: z.coerce.date(),
        type: z.enum(['MANDATORY', 'OPTIONAL']).optional()
      })
    )
  })
});

export const getHolidayCalendarSchema = z.object({
  params: z.object({
    locationId: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId.'),
    year: z.string().regex(/^\d{4}$/)
  })
});

export default {
  createOrUpdateHolidayCalendarSchema,
  getHolidayCalendarSchema
};
