import logger from '#@/platform/logger/index.js';
import AttendancePolicyRepository from '../repositories/AttendancePolicyRepository.js';
import LocationRepository from '#@/modules/organization/repositories/LocationRepository.js';
import AuditService from '#@/modules/audit/services/AuditService.js';
import { NotFoundError, ConflictError, ValidationError } from '#@/core/errors/AppError.js';

// System-level defaults used when no org default exists.
const SYSTEM_DEFAULTS = {
  lateAfterMinutes: 15,
  halfDayAfterHours: 4,
  minimumWorkingHours: 8,
  overtimeStartsAfterHours: 9,
  autoApproveGeofence: false,
  maximumOpenAttendanceHours: 16
};

export class AttendancePolicyService {
  /**
   * Resolves the effective AttendancePolicy for a given location.
   * Hierarchy: Location-specific policy -> Org default policy -> System defaults.
   *
   * @param {string} locationId
   * @param {string} organizationId
   * @param {Object} [options]
   * @returns {Object} A plain policySnapshot object (not a Mongoose document).
   */
  async resolveForLocation(locationId, organizationId, options = {}) {
    const location = await LocationRepository.findByIdAndTenant(locationId, organizationId, options);
    if (!location) throw new NotFoundError('Location not found.');
    return this.resolveForLocationObject(location, organizationId, options);
  }

  /**
   * Resolves the effective AttendancePolicy given an already-fetched Location document.
   * Used by AttendanceClockService to avoid a second DB fetch on every clock-in.
   * [FIX S] Eliminates the double Location lookup identified in audit finding S.
   *
   * @param {Object} location - An already-fetched Location Mongoose document
   * @param {string} organizationId
   * @param {Object} [options]
   * @returns {Object} A plain policySnapshot object (not a Mongoose document).
   */
  async resolveForLocationObject(location, organizationId, options = {}) {
    // Level 1: Location-specific policy.
    if (location.attendancePolicyId) {
      const policy = await AttendancePolicyRepository.findByIdAndTenant(
        location.attendancePolicyId,
        organizationId,
        options
      );
      if (policy && policy.status === 'ACTIVE') return this._toSnapshot(policy);
    }

    // Level 2: Organization default policy.
    const orgDefault = await AttendancePolicyRepository.findDefault(organizationId, options);
    if (orgDefault) return this._toSnapshot(orgDefault);

    // Level 3: System defaults (hardcoded safety net).
    logger.warn({ organizationId, locationId: location._id }, 'No AttendancePolicy found, using system defaults');
    return { ...SYSTEM_DEFAULTS };
  }


  /**
   * Extracts a plain snapshot object from a policy document.
   * This is what gets persisted inside AttendanceRecord.policySnapshot.
   */
  _toSnapshot(policy) {
    return {
      lateAfterMinutes: policy.lateAfterMinutes,
      halfDayAfterHours: policy.halfDayAfterHours,
      minimumWorkingHours: policy.minimumWorkingHours,
      overtimeStartsAfterHours: policy.overtimeStartsAfterHours,
      autoApproveGeofence: policy.autoApproveGeofence,
      maximumOpenAttendanceHours: policy.maximumOpenAttendanceHours ?? SYSTEM_DEFAULTS.maximumOpenAttendanceHours
    };
  }

  async createPolicy(payload, actor, organizationId, options = {}) {
    const { name, isDefault, lateAfterMinutes, halfDayAfterHours, minimumWorkingHours, overtimeStartsAfterHours, autoApproveGeofence, maximumOpenAttendanceHours } = payload;

    // Enforce single default per organization.
    if (isDefault) {
      const existingDefault = await AttendancePolicyRepository.findDefault(organizationId, options);
      if (existingDefault) throw new ConflictError('An organization-default attendance policy already exists. Archive or unset the current default first.');
    }

    const policy = await AttendancePolicyRepository.createScoped({
      name: name.trim(),
      isDefault: isDefault || false,
      lateAfterMinutes: lateAfterMinutes ?? SYSTEM_DEFAULTS.lateAfterMinutes,
      halfDayAfterHours: halfDayAfterHours ?? SYSTEM_DEFAULTS.halfDayAfterHours,
      minimumWorkingHours: minimumWorkingHours ?? SYSTEM_DEFAULTS.minimumWorkingHours,
      overtimeStartsAfterHours: overtimeStartsAfterHours ?? SYSTEM_DEFAULTS.overtimeStartsAfterHours,
      autoApproveGeofence: autoApproveGeofence ?? false,
      maximumOpenAttendanceHours: maximumOpenAttendanceHours ?? SYSTEM_DEFAULTS.maximumOpenAttendanceHours,
      status: 'ACTIVE'
    }, organizationId, options);

    await AuditService.logAction({
      organizationId,
      actorId: actor?.userId || null,
      action: 'CREATE_ATTENDANCE_POLICY',
      entityType: 'AttendancePolicy',
      entityId: policy._id,
      newValue: { name: policy.name, isDefault: policy.isDefault }
    }, options);

    logger.info({ organizationId, policyId: policy._id }, 'Attendance policy created');
    return policy;
  }

  async updatePolicy(id, payload, actor, organizationId, options = {}) {
    const policy = await AttendancePolicyRepository.findByIdAndTenant(id, organizationId, options);
    if (!policy) throw new NotFoundError('Attendance policy not found.');
    if (policy.status === 'ARCHIVED') throw new ValidationError('Cannot update an archived policy.');

    // If trying to set this as default, ensure no other default exists.
    if (payload.isDefault === true && !policy.isDefault) {
      const existingDefault = await AttendancePolicyRepository.findDefault(organizationId, options);
      if (existingDefault && String(existingDefault._id) !== String(id)) {
        throw new ConflictError('Another default attendance policy already exists.');
      }
    }

    // Whitelist fields to prevent callers from overwriting protected fields (organizationId, status, archivedAt).
    const { name, isDefault, lateAfterMinutes, halfDayAfterHours, minimumWorkingHours, overtimeStartsAfterHours, autoApproveGeofence, maximumOpenAttendanceHours } = payload;
    const safeUpdate = Object.fromEntries(
      Object.entries({ name, isDefault, lateAfterMinutes, halfDayAfterHours, minimumWorkingHours, overtimeStartsAfterHours, autoApproveGeofence, maximumOpenAttendanceHours })
        .filter(([, v]) => v !== undefined)
    );

    const updated = await AttendancePolicyRepository.updateByIdAndTenant(id, safeUpdate, organizationId, options);

    await AuditService.logAction({
      organizationId,
      actorId: actor?.userId || null,
      action: 'UPDATE_ATTENDANCE_POLICY',
      entityType: 'AttendancePolicy',
      entityId: id,
      previousValue: { name: policy.name },
      newValue: { name: updated.name }
    }, options);

    logger.info({ organizationId, policyId: id }, 'Attendance policy updated');
    return updated;
  }

  async getPolicies(filters, organizationId, options = {}) {
    return await AttendancePolicyRepository.findPaginated({
      filter: filters,
      page: options.page || 1,
      limit: options.limit || 20,
      sort: { isDefault: -1, name: 1 }
    }, organizationId, options);
  }

  async getPolicyById(id, organizationId, options = {}) {
    const policy = await AttendancePolicyRepository.findByIdAndTenant(id, organizationId, options);
    if (!policy) throw new NotFoundError('Attendance policy not found.');
    return policy;
  }
}

export default new AttendancePolicyService();
