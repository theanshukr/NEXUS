import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId',
});

// A standard query parser class, acting as our DTO for all reports.
export class AttendanceReportQuery {
  constructor(query) {
    this.dateFrom = query.dateFrom || null;
    this.dateTo = query.dateTo || null;
    this.departmentId = query.departmentId || null;
    this.locationId = query.locationId || null;
    this.employeeId = query.employeeId || null;
    this.managerId = query.managerId || null;
    this.status = query.status || null;
    this.search = query.search || null;
    this.type = query.type || 'summary';
    this.format = query.format || 'json';
    
    // Pagination & Sorting
    this.page = parseInt(query.page, 10) || 1;
    this.limit = parseInt(query.limit, 10) || 50;
    this.sort = query.sort || '-date';
  }
}

// Zod Schema for input validation
export const reportQuerySchema = z.object({
  query: z.object({
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
    departmentId: objectIdSchema.optional(),
    locationId: objectIdSchema.optional(),
    employeeId: objectIdSchema.optional(),
    managerId: objectIdSchema.optional(),
    status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'WEEKLY_OFF']).optional(),
    search: z.string().max(100).optional(),
    type: z.enum(['summary', 'overtime', 'late', 'department', 'employee', 'daily', 'analytics']).optional(),
    format: z.enum(['json', 'csv', 'xlsx']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    sort: z.string().max(50).optional()
  })
});
