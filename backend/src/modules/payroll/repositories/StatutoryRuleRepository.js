import BaseRepository from '#@/core/repositories/BaseRepository.js';
import { StatutoryRule } from '../models/StatutoryRule.js';

export class StatutoryRuleRepository extends BaseRepository {
  constructor() {
    super(StatutoryRule);
  }

  async findActiveRules(organizationId, options = {}) {
    return await this.find({ isActive: true }, organizationId, options);
  }

  async findByName(name, organizationId, options = {}) {
    return await this.findOne({ name }, organizationId, options);
  }
}

export default StatutoryRuleRepository;
