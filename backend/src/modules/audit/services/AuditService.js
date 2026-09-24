import logger from '#@/platform/logger/index.js';
import AuditRepository from '../repositories/AuditRepository.js';

export class AuditService {
  /**
   * Records an immutable audit log entry for a sensitive administrative action.
   * Supports execution inside an ACID transaction via `options = { session }`.
   */
  async logAction(data, options = {}) {
    const {
      organizationId,
      actorId,
      action,
      entityType,
      entityId,
      previousValue = null,
      newValue = null,
      ipAddress = null,
      userAgent = null
    } = data;

    try {
      const logEntry = await AuditRepository.createScoped({
        actorId,
        action,
        entityType,
        entityId,
        previousValue,
        newValue,
        ipAddress,
        userAgent,
        timestamp: new Date()
      }, organizationId, options);

      logger.info({
        auditId: logEntry._id,
        organizationId,
        actorId,
        action,
        entityType,
        entityId
      }, 'Recorded immutable audit log');

      return logEntry;
    } catch (error) {
      // Avoid failing business workflows if non-critical audit recording encounters an error,
      // but log an urgent security alert via structured logger.
      logger.error({ error: error.message, data }, 'CRITICAL: Failed to write immutable audit log entry');
      if (options.session) {
        // If inside a transaction, rethrow to rollback the entire atomic operation
        throw error;
      }
      return null;
    }
  }

  /**
   * Retrieves audit logs for a specific tenant organization.
   */
  async getTenantLogs(organizationId, filter = {}, options = {}) {
    return await AuditRepository.findLogsByTenant(organizationId, filter, options);
  }
}

export default new AuditService();
