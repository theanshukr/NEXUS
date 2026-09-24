import { z } from 'zod';

export const requestRegularizationSchema = z.object({
  body: z.object({
    attendanceRecordId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Attendance Record ID'),
    targetEventId: z.string().uuid().nullable().optional(),
    type: z.enum(['CLOCK_IN', 'CLOCK_OUT', 'FULL_DAY']),
    requestedClockIn: z.string().datetime().nullable().optional(),
    requestedClockOut: z.string().datetime().nullable().optional(),
    reason: z.string().min(5, 'Reason must be at least 5 characters').max(1000)
  })
});

export const reviewRegularizationSchema = z.object({
  body: z.object({
    reviewerComments: z.string().max(1000).nullable().optional()
  })
});
