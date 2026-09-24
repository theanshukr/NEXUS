import BaseRepository from '#@/core/repositories/BaseRepository.js';
import Department from '../models/Department.js';

export class DepartmentRepository extends BaseRepository {
  constructor() {
    super(Department);
  }

  async findByCode(code, organizationId, options = {}) {
    this._validateTenantScope(organizationId);
    const filter = this._scopeFilter({ code: code.trim().toUpperCase() }, organizationId);
    return await this.model.findOne(filter, null, options);
  }

  async findByNameAndParent(name, parentDepartmentId, organizationId, options = {}) {
    this._validateTenantScope(organizationId);
    const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = this._scopeFilter({
      name: { $regex: new RegExp(`^${escaped}$`, 'i') },
      parentDepartmentId: parentDepartmentId || null,
      status: 'ACTIVE'
    }, organizationId);
    return await this.model.findOne(filter, null, options);
  }

  async findDescendants(departmentId, organizationId, options = {}) {
    return await this.find({ 'ancestors._id': departmentId }, organizationId, options);
  }

  async findRoots(organizationId, options = {}) {
    return await this.find({ parentDepartmentId: null, status: 'ACTIVE' }, organizationId, options);
  }

  async updateDescendantAncestorMetadata(ancestorId, newName, newCode, organizationId, options = {}) {
    this._validateTenantScope(organizationId);
    const filter = this._scopeFilter({ 'ancestors._id': ancestorId }, organizationId);
    return await this.model.updateMany(
      filter,
      {
        $set: {
          'ancestors.$[elem].name': newName.trim(),
          'ancestors.$[elem].code': newCode.trim().toUpperCase()
        }
      },
      {
        ...options,
        arrayFilters: [{ 'elem._id': ancestorId }]
      }
    );
  }
}

export default new DepartmentRepository();
