import BaseRepository from '../../../core/repositories/BaseRepository.js';
import Project from '../models/Project.js';

class ProjectRepository extends BaseRepository {
  constructor() {
    super(Project);
  }

  async findByOrganization(organizationId, filter = {}, options = {}) {
    return this.find(filter, organizationId, options);
  }
}

export default new ProjectRepository();
