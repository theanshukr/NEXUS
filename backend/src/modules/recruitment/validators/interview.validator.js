import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const objectIdValidator = z.string().refine((val) => isValidObjectId(val), {
  message: 'Invalid ObjectId format'
});

export const scheduleInterviewSchema = z.object({
  body: z.object({
    stageId: z.string().min(1, "Stage ID is required"),
    round: z.number().int().min(1).default(1),
    title: z.string().min(1, "Title is required").max(100),
    interviewType: z.enum(['ONLINE', 'OFFLINE', 'PHONE']),
    scheduledStart: z.string().datetime({ message: "Invalid ISO datetime string" }),
    scheduledEnd: z.string().datetime({ message: "Invalid ISO datetime string" }),
    timezone: z.string().min(1, "Timezone is required"),
    meetingUrl: z.string().url("Must be a valid URL").optional().nullable(),
    location: z.string().optional().nullable(),
    interviewerIds: z.array(objectIdValidator).min(1, "At least one interviewer is required")
  }).refine(data => new Date(data.scheduledStart) < new Date(data.scheduledEnd), {
    message: "Scheduled end time must be after scheduled start time",
    path: ["scheduledEnd"]
  })
});

export const evaluateInterviewSchema = z.object({
  body: z.object({
    technicalScore: z.number().min(0).max(100).optional(),
    communicationScore: z.number().min(0).max(100).optional(),
    cultureScore: z.number().min(0).max(100).optional(),
    overallScore: z.number().min(0).max(100).optional(),
    recommendation: z.enum(['HIRE', 'REJECT', 'HOLD']),
    comments: z.string().min(1, "Comments are required for evaluation")
  })
});
