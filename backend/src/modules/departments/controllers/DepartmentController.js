import DepartmentService from '../services/DepartmentService.js';
import NotificationService from '../../notifications/services/NotificationService.js';


export const openApiMetadata = {
  getDepartments: {
    summary: 'getDepartments',
    description: '',
    tags: ['Department']
  },
  getDepartmentTree: {
    summary: 'getDepartmentTree',
    description: '',
    tags: ['Department']
  },
  getSelectOptions: {
    summary: 'getSelectOptions',
    description: '',
    tags: ['Department']
  },
  getDepartmentById: {
    summary: 'getDepartmentById',
    description: '',
    tags: ['Department']
  },
  createDepartment: {
    summary: 'createDepartment',
    description: '',
    tags: ['Department']
  },
  updateDepartment: {
    summary: 'updateDepartment',
    description: '',
    tags: ['Department']
  },
  moveDepartment: {
    summary: 'moveDepartment',
    description: '',
    tags: ['Department']
  },
  archiveDepartment: {
    summary: 'archiveDepartment',
    description: '',
    tags: ['Department']
  }
};

export class DepartmentController {
  async getDepartments(req, res, next) {
    try {
      if (req.query.tree === 'true') {
        const tree = await DepartmentService.getDepartmentTree(req.user.organizationId, {
          includeArchived: req.query.includeArchived === 'true'
        });
        return res.status(200).json({
          success: true,
          data: tree
        });
      }

      const result = await DepartmentService.search(req.query, req.user.organizationId, {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 50
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getDepartmentTree(req, res, next) {
    try {
      const tree = await DepartmentService.getDepartmentTree(req.user.organizationId, {
        includeArchived: req.query.includeArchived === 'true'
      });
      res.status(200).json({
        success: true,
        data: tree
      });
    } catch (error) {
      next(error);
    }
  }

  async getSelectOptions(req, res, next) {
    try {
      const options = await DepartmentService.getSelectOptions(req.user.organizationId);
      res.status(200).json({
        success: true,
        data: options
      });
    } catch (error) {
      next(error);
    }
  }

  async getDepartmentById(req, res, next) {
    try {
      const { id } = req.params;
      const department = await DepartmentService.validateExistsAndActive(id, req.user.organizationId);
      res.status(200).json({
        success: true,
        data: department
      });
    } catch (error) {
      next(error);
    }
  }

  async createDepartment(req, res, next) {
    try {
      const department = await DepartmentService.createDepartment(req.body, req.user, req.user.organizationId);
      
      // Emit Notification
      await NotificationService.sendNotification(req.user.organizationId, {
        title: 'New Department Created',
        message: `Department '${department.name}' has been created.`,
        priority: 'info',
        targetRoles: ['HR Manager', 'Super Admin', 'IT Admin']
      }).catch(err => console.error('Notification Error:', err));

      res.status(201).json({
        success: true,
        data: department,
        message: `Department '${department.name}' created successfully.`
      });
    } catch (error) {
      next(error);
    }
  }

  async updateDepartment(req, res, next) {
    try {
      const { id } = req.params;
      const department = await DepartmentService.updateDepartment(id, req.body, req.user, req.user.organizationId);
      res.status(200).json({
        success: true,
        data: department,
        message: `Department '${department.name}' updated successfully.`
      });
    } catch (error) {
      next(error);
    }
  }

  async moveDepartment(req, res, next) {
    try {
      const { id } = req.params;
      const { parentDepartmentId } = req.body;
      const department = await DepartmentService.moveDepartment(id, parentDepartmentId, req.user, req.user.organizationId);
      res.status(200).json({
        success: true,
        data: department,
        message: `Department '${department.name}' moved successfully.`
      });
    } catch (error) {
      next(error);
    }
  }

  async archiveDepartment(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      const department = await DepartmentService.archiveDepartment(id, reason, req.user, req.user.organizationId);
      res.status(200).json({
        success: true,
        data: department,
        message: `Department '${department.name}' archived successfully.`
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new DepartmentController();
