import BaseRepository from '#@/core/repositories/BaseRepository.js';
import { SalaryRevision } from '../models/SalaryRevision.js';

export class SalaryRevisionRepository extends BaseRepository {
  constructor() {
    super(SalaryRevision);
  }

  async findByTarget(targetId, targetType, organizationId, options = {}) {
    return await this.find({ targetId, targetType }, organizationId, options);
  }
}

export default SalaryRevisionRepository;
