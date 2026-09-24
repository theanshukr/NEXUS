import BaseRepository from '../../../core/repositories/BaseRepository.js';
import Task from '../models/Task.js';

class TaskRepository extends BaseRepository {
  constructor() {
    super(Task);
  }

  async findByOrganization(organizationId, filter = {}, options = {}) {
    return this.find(filter, organizationId, { populate: 'projectId', ...options });
  }
}

export default new TaskRepository();
