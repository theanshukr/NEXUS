import { z } from 'zod';
import { ValidationError, NotFoundError } from '#@/core/errors/AppError.js';
import AttendanceRecordRepository from '../repositories/AttendanceRecordRepository.js';
import EventBus from '#@/core/events/EventBus.js';

const resolveConflictSchema = z.object({
  resolutionType: z.string().min(1, 'Resolution type is required'),
  resolutionNotes: z.string().optional()
});

class AttendanceConflictController {
  async resolveConflict(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.tenantId;
      const { resolutionType, resolutionNotes } = resolveConflictSchema.parse(req.body);

      const record = await AttendanceRecordRepository.findByIdAndTenant(id, organizationId);
      if (!record) {
        throw new NotFoundError('Attendance record not found.');
      }

      if (record.conflictStatus !== 'PENDING_REVIEW') {
        throw new ValidationError('Record is not in a PENDING_REVIEW conflict state.');
      }

      // Update record
      const updatedRecord = await AttendanceRecordRepository.updateByIdAndTenant(id, {
        conflictStatus: 'RESOLVED',
        resolvedBy: req.user.userId,
        resolvedAt: new Date(),
        resolutionType,
        resolutionNotes
      }, organizationId);

      const AuditService = (await import('#@/modules/audit/services/AuditService.js')).default;
      await AuditService.logAction({
        organizationId,
        actorId: req.user.userId,
        action: 'ATTENDANCE_CONFLICT_RESOLVED',
        entityType: 'AttendanceRecord',
        entityId: updatedRecord._id,
        metadata: { resolutionType, resolutionNotes }
      });

      // Emit event for Leave Module or others to handle balance/ledger mutations
      EventBus.emit('ATTENDANCE.CONFLICT_RESOLVED', {
        recordId: updatedRecord._id,
        employeeId: updatedRecord.employeeId,
        organizationId: updatedRecord.organizationId,
        leaveRequestId: updatedRecord.leaveRequestId,
        resolutionType,
        resolutionNotes,
        resolvedBy: req.user.userId,
        timestamp: new Date()
      });

      res.status(200).json({
        success: true,
        data: updatedRecord
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AttendanceConflictController();
