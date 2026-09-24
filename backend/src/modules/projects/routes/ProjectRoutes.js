import express from 'express';
import { authenticate } from '../../../core/middleware/auth.js';
import { requireTenant } from '../../../core/middleware/tenant.js';
import { hasPermission } from '../../../core/middleware/hasPermission.js';
import projectController from '../controllers/ProjectController.js';

const router = express.Router();

router.use(authenticate);
router.use(requireTenant);

// Projects
router.get('/', hasPermission('projects.view'), projectController.getAllProjects);
router.post('/', hasPermission('projects.manage'), projectController.createProject);

// Tasks
router.get('/tasks', projectController.getAllTasks); // Any employee can view tasks assigned to them
router.post('/tasks', hasPermission('projects.manage'), projectController.createTask);
router.patch('/tasks/:id/status', projectController.updateTaskStatus); // Any assigned employee can update status

export default router;
