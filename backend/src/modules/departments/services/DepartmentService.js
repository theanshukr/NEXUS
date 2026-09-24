import logger from '#@/platform/logger/index.js';
import cacheService from '#@/platform/cache/index.js';
import DepartmentRepository from '../repositories/DepartmentRepository.js';
import AuditService from '#@/modules/audit/services/AuditService.js';
import EventBus from '#@/core/events/EventBus.js';
import EVENTS from '#@/core/constants/events/index.js';
import { runInTransaction } from '#@/platform/database/db.js';
import { ValidationError, NotFoundError, ConflictError } from '#@/core/errors/AppError.js';

export class DepartmentService {
  /**
   * Create a new department node in the organization tree.
   */
  async createDepartment(payload, actor, organizationId, options = {}) {
    const { code, name, description, parentDepartmentId = null, managerUserId = null } = payload;

    const existingCode = await DepartmentRepository.findByCode(code, organizationId, options);
    if (existingCode) {
      throw new ConflictError(`A department with code '${code}' already exists in this organization.`);
    }

    let level = 0;
    let ancestors = [];
    if (parentDepartmentId) {
      const parent = await DepartmentRepository.findByIdAndTenant(parentDepartmentId, organizationId, options);
      if (!parent || parent.status !== 'ACTIVE') {
        throw new ValidationError('Parent department not found or is archived.');
      }
      level = parent.level + 1;
      ancestors = [
        ...parent.ancestors,
        { _id: parent._id, code: parent.code, name: parent.name, level: parent.level }
      ];
    }

    const existingName = await DepartmentRepository.findByNameAndParent(name, parentDepartmentId, organizationId, options);
    if (existingName) {
      throw new ConflictError(`A department with name '${name}' already exists under the target parent in this organization.`);
    }

    const created = await DepartmentRepository.createScoped({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description?.trim() || '',
      parentDepartmentId: parentDepartmentId || null,
      ancestors,
      level,
      managerUserId: managerUserId || null,
      cachedEmployeeCount: 0,
      status: 'ACTIVE'
    }, organizationId, options);

    await AuditService.logAction({
      organizationId,
      actorId: actor?.userId || null,
      action: 'DEPARTMENT_CREATED',
      entityType: 'Department',
      entityId: created._id,
      newValue: { code: created.code, name: created.name, parentDepartmentId: created.parentDepartmentId, level: created.level }
    }, options);

    await this._invalidateCache(organizationId);
    logger.info({ organizationId, departmentId: created._id, code: created.code }, 'Created new department');

    EventBus.emit(EVENTS.DEPARTMENT.CREATED, { organizationId, departmentId: created._id, code: created.code, name: created.name });

    return created;
  }

  /**
   * Update an existing department, handling potential hierarchy re-parenting.
   */
  async updateDepartment(id, payload, actor, organizationId, options = {}) {
    const dept = await DepartmentRepository.findByIdAndTenant(id, organizationId, options);
    if (!dept) {
      throw new NotFoundError('Department not found.');
    }
    if (dept.status === 'ARCHIVED') {
      throw new ValidationError('Cannot update an archived department.');
    }

    const needsHierarchyUpdate = payload.parentDepartmentId !== undefined &&
      String(payload.parentDepartmentId || '') !== String(dept.parentDepartmentId || '');
    const needsMetadataUpdate = (payload.code && payload.code.trim().toUpperCase() !== dept.code) ||
      (payload.name && payload.name.trim() !== dept.name);

    if (!options.session && (needsHierarchyUpdate || needsMetadataUpdate)) {
      return await runInTransaction(async (session) => {
        return await this._doUpdateDepartment(dept, payload, actor, organizationId, { ...options, session });
      });
    }

    return await this._doUpdateDepartment(dept, payload, actor, organizationId, options);
  }

  async _doUpdateDepartment(dept, payload, actor, organizationId, options = {}) {
    const id = dept._id;
    const updateData = { ...payload };

    if (payload.code && payload.code.trim().toUpperCase() !== dept.code) {
      const existingCode = await DepartmentRepository.findByCode(payload.code, organizationId, options);
      if (existingCode && String(existingCode._id) !== String(id)) {
        throw new ConflictError(`A department with code '${payload.code}' already exists in this organization.`);
      }
      updateData.code = payload.code.trim().toUpperCase();
    }

    if (payload.name && payload.name.trim() !== dept.name) {
      const targetParentId = payload.parentDepartmentId !== undefined ? (payload.parentDepartmentId || null) : dept.parentDepartmentId;
      const existingName = await DepartmentRepository.findByNameAndParent(payload.name, targetParentId, organizationId, options);
      if (existingName && String(existingName._id) !== String(id)) {
        throw new ConflictError(`A department with name '${payload.name}' already exists under the target parent in this organization.`);
      }
      updateData.name = payload.name.trim();
    }

    let levelDelta = 0;
    let newAncestors = dept.ancestors;
    let newLevel = dept.level;

    if (payload.parentDepartmentId !== undefined && String(payload.parentDepartmentId || '') !== String(dept.parentDepartmentId || '')) {
      const targetParentId = payload.parentDepartmentId || null;
      if (targetParentId && String(targetParentId) === String(id)) {
        throw new ConflictError('A department cannot be its own parent.');
      }

      if (targetParentId) {
        const newParent = await DepartmentRepository.findByIdAndTenant(targetParentId, organizationId, options);
        if (!newParent || newParent.status !== 'ACTIVE') {
          throw new ValidationError('Target parent department not found or is archived.');
        }
        if (newParent.ancestors.some(a => String(a._id) === String(id))) {
          throw new ConflictError('Cannot move department under one of its own descendants.');
        }
        newLevel = newParent.level + 1;
        newAncestors = [
          ...newParent.ancestors,
          { _id: newParent._id, code: newParent.code, name: newParent.name, level: newParent.level }
        ];
      } else {
        newLevel = 0;
        newAncestors = [];
      }

      levelDelta = newLevel - dept.level;
      updateData.parentDepartmentId = targetParentId;
      updateData.level = newLevel;
      updateData.ancestors = newAncestors;

      const descendants = await DepartmentRepository.findDescendants(id, organizationId, options);
      const bulkOperations = descendants.reduce((acc, desc) => {
        const idx = desc.ancestors.findIndex(a => String(a._id) === String(id));
        if (idx !== -1) {
          const prefix = [
            ...newAncestors,
            { _id: dept._id, code: updateData.code || dept.code, name: updateData.name || dept.name, level: newLevel }
          ];
          const suffix = desc.ancestors.slice(idx + 1).map(a => ({ ...a, level: a.level + levelDelta }));
          acc.push({
            updateOne: {
              filter: { _id: desc._id, organizationId },
              update: {
                $set: {
                  ancestors: [...prefix, ...suffix],
                  level: desc.level + levelDelta
                }
              }
            }
          });
        }
        return acc;
      }, []);

      if (bulkOperations.length > 0) {
        await DepartmentRepository.model.bulkWrite(bulkOperations, { session: options.session });
      }
    } else if ((updateData.code && updateData.code !== dept.code) || (updateData.name && updateData.name !== dept.name)) {
      await DepartmentRepository.updateDescendantAncestorMetadata(
        id,
        updateData.name || dept.name,
        updateData.code || dept.code,
        organizationId,
        options
      );
    }

    const updated = await DepartmentRepository.updateByIdAndTenant(id, updateData, organizationId, options);

    await AuditService.logAction({
      organizationId,
      actorId: actor?.userId || null,
      action: 'DEPARTMENT_UPDATED',
      entityType: 'Department',
      entityId: id,
      previousValue: { code: dept.code, name: dept.name, parentDepartmentId: dept.parentDepartmentId, level: dept.level },
      newValue: { code: updated.code, name: updated.name, parentDepartmentId: updated.parentDepartmentId, level: updated.level }
    }, options);

    await this._invalidateCache(organizationId);
    logger.info({ organizationId, departmentId: id }, 'Updated department');

    EventBus.emit(EVENTS.DEPARTMENT.UPDATED, { organizationId, departmentId: id, changes: { code: updated.code, name: updated.name } });

    return updated;
  }

  /**
   * Move a department to a new parent in the hierarchy.
   */
  async moveDepartment(id, newParentId, actor, organizationId, options = {}) {
    return await this.updateDepartment(id, { parentDepartmentId: newParentId || null }, actor, organizationId, options);
  }

  /**
   * Soft archive a department. Blocks if active employees or active subordinate departments exist.
   */
  async archiveDepartment(id, reason, actor, organizationId, options = {}) {
    const dept = await DepartmentRepository.findByIdAndTenant(id, organizationId, options);
    if (!dept) {
      throw new NotFoundError('Department not found.');
    }
    if (dept.status === 'ARCHIVED') {
      throw new ConflictError('Department is already archived.');
    }

    if (dept.cachedEmployeeCount > 0) {
      throw new ConflictError('Cannot archive department: active employees are currently assigned to this department.');
    }

    const activeChildren = await DepartmentRepository.find({ parentDepartmentId: id, status: 'ACTIVE' }, organizationId, options);
    if (activeChildren.length > 0) {
      throw new ConflictError('Cannot archive department: active subordinate departments exist.');
    }

    const archived = await DepartmentRepository.updateByIdAndTenant(id, {
      status: 'ARCHIVED',
      archivedAt: new Date(),
      archivedBy: actor?.userId || null,
      archiveReason: reason?.trim() || null
    }, organizationId, options);

    await AuditService.logAction({
      organizationId,
      actorId: actor?.userId || null,
      action: 'DEPARTMENT_ARCHIVED',
      entityType: 'Department',
      entityId: id,
      previousValue: { status: 'ACTIVE' },
      newValue: { status: 'ARCHIVED', archiveReason: reason }
    }, options);

    await this._invalidateCache(organizationId);
    logger.info({ organizationId, departmentId: id }, 'Archived department');

    EventBus.emit(EVENTS.DEPARTMENT.ARCHIVED, { organizationId, departmentId: id, archiveReason: reason });

    return archived;
  }

  /**
   * Get the complete hierarchical department tree for an organization.
   */
  async getDepartmentTree(organizationId, options = {}) {
    const cacheKey = `tenant:${organizationId}:cache:departments`;
    if (!options.session && !options.fresh) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const filter = options.includeArchived ? {} : { status: 'ACTIVE' };
    const departments = await DepartmentRepository.find(filter, organizationId, { sort: { level: 1, name: 1 }, ...options });

    const map = {};
    const roots = [];

    for (const d of departments) {
      const item = typeof d.toObject === 'function' ? d.toObject() : { ...d };
      item.children = [];
      map[item._id.toString()] = item;
    }

    for (const id in map) {
      const item = map[id];
      if (item.parentDepartmentId && map[item.parentDepartmentId.toString()]) {
        map[item.parentDepartmentId.toString()].children.push(item);
      } else {
        roots.push(item);
      }
    }

    if (!options.session) {
      await cacheService.set(cacheKey, roots, 3600);
    }

    return roots;
  }

  /**
   * Validate that a department exists and is active.
   */
  async validateExistsAndActive(id, organizationId, options = {}) {
    const dept = await DepartmentRepository.findByIdAndTenant(id, organizationId, options);
    if (!dept) {
      throw new NotFoundError('Department not found.');
    }
    if (dept.status !== 'ACTIVE') {
      throw new ValidationError('Department is not active.');
    }
    return dept;
  }

  /**
   * Search departments by keyword, status, or parent.
   */
  async search(query, organizationId, options = {}) {
    const filter = {};
    if (query.status) {
      filter.status = query.status;
    } else if (!query.includeArchived) {
      filter.status = 'ACTIVE';
    }

    if (query.keyword) {
      const escaped = query.keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ name: { $regex: regex } }, { code: { $regex: regex } }];
    }

    if (query.parentDepartmentId !== undefined) {
      filter.parentDepartmentId = query.parentDepartmentId || null;
    }

    return await DepartmentRepository.findPaginated(filter, organizationId, { sort: { level: 1, name: 1 }, ...options });
  }

  /**
   * Get a lean list of select options for UI dropdowns.
   */
  async getSelectOptions(organizationId, options = {}) {
    const departments = await DepartmentRepository.find({ status: 'ACTIVE' }, organizationId, { sort: { level: 1, name: 1 }, ...options });
    return departments.map(d => ({
      value: d._id,
      label: d.name,
      code: d.code,
      level: d.level,
      parentId: d.parentDepartmentId
    }));
  }

  /**
   * Invalidate department Redis cache.
   */
  async _invalidateCache(organizationId) {
    try {
      const keys = await cacheService.keys(`tenant:${organizationId}:cache:departments*`);
      if (keys && keys.length > 0) {
        await cacheService.delete(keys);
      }
    } catch (err) {
      logger.warn({ err: err.message, organizationId }, 'Failed to invalidate department cache pattern');
    }
  }
}

export default new DepartmentService();
