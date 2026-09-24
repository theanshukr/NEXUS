import { catchAsync } from '../../../core/utils/catchAsync.js';
import { successResponse } from '../../../core/utils/response.js';
import projectService from '../services/ProjectService.js';

class ProjectController {
  getAllProjects = catchAsync(async (req, res) => {
    const { organizationId } = req.user;
    const projects = await projectService.getAllProjects(organizationId);
    return successResponse(res, projects);
  });

  createProject = catchAsync(async (req, res) => {
    const { organizationId } = req.user;
    const project = await projectService.createProject(organizationId, req.body);
    return successResponse(res, project, 'Project created', 201);
  });

  getAllTasks = catchAsync(async (req, res) => {
    const { organizationId } = req.user;
    const tasks = await projectService.getAllTasks(organizationId);
    return successResponse(res, tasks);
  });

  createTask = catchAsync(async (req, res) => {
    const { organizationId } = req.user;
    const task = await projectService.createTask(organizationId, req.body);
    return successResponse(res, task, 'Task created', 201);
  });

  updateTaskStatus = catchAsync(async (req, res) => {
    const { organizationId } = req.user;
    const { id } = req.params;
    const { status } = req.body;
    const task = await projectService.updateTaskStatus(organizationId, id, status);
    return successResponse(res, task, 'Task status updated');
  });
}

export default new ProjectController();
