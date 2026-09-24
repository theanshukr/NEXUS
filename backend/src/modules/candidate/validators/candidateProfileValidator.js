import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId',
});

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name cannot be empty').optional(),
    lastName: z.string().min(1, 'Last name cannot be empty').optional(),
    phone: z.string().optional(),
    headline: z.string().optional(),
    summary: z.string().optional(),
    education: z.array(z.object({
      institution: z.string().min(1),
      degree: z.string().min(1),
      fieldOfStudy: z.string().optional(),
      startDate: z.string().or(z.date()).optional(),
      endDate: z.string().or(z.date()).optional(),
      current: z.boolean().optional()
    })).optional(),
    experience: z.array(z.object({
      title: z.string().min(1),
      company: z.string().min(1),
      location: z.string().optional(),
      startDate: z.string().or(z.date()).optional(),
      endDate: z.string().or(z.date()).optional(),
      current: z.boolean().optional(),
      description: z.string().optional()
    })).optional(),
    skills: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
    certifications: z.array(z.object({
      name: z.string().min(1),
      issuer: z.string().optional(),
      issueDate: z.string().or(z.date()).optional(),
      url: z.string().optional()
    })).optional(),
    socialLinks: z.object({
      linkedin: z.string().optional(),
      github: z.string().optional(),
      portfolio: z.string().optional(),
      twitter: z.string().optional()
    }).optional(),
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional()
    }).optional(),
    profilePhotoDocumentId: objectIdSchema.nullable().optional()
  }).strict()
});
