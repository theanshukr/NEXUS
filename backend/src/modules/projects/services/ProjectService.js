import projectRepo from '../repositories/ProjectRepository.js';
import taskRepo from '../repositories/TaskRepository.js';

class ProjectService {
  async getAllProjects(organizationId) {
    return projectRepo.findByOrganization(organizationId, {}, { sort: { createdAt: -1 } });
  }

  async createProject(organizationId, data) {
    return projectRepo.create({ organizationId, ...data });
  }

  async getAllTasks(organizationId) {
    return taskRepo.findByOrganization(organizationId, {}, { sort: { createdAt: -1 } });
  }

  async createTask(organizationId, data) {
    return taskRepo.create({ organizationId, ...data });
  }

  async updateTaskStatus(organizationId, taskId, status) {
    const task = await taskRepo.findById(taskId);
    if (!task || task.organizationId.toString() !== organizationId.toString()) {
      throw new Error('Task not found');
    }
    task.status = status;
    return task.save();
  }
}

export default new ProjectService();
