import EmployeeService from '../services/EmployeeService.js';
import NotificationService from '../../notifications/services/NotificationService.js';

/**
 * EmployeeController — M-03
 *
 * Thin HTTP orchestration layer. Extracts request data, delegates to EmployeeService,
 * and formats JSON responses. Contains zero business logic.
 */

export const openApiMetadata = {
  getEmployees: {
    summary: 'getEmployees',
    description: '',
    tags: ['Employee']
  },
  getOrgChart: {
    summary: 'getOrgChart',
    description: '',
    tags: ['Employee']
  },
  getEmployeeById: {
    summary: 'getEmployeeById',
    description: '',
    tags: ['Employee']
  },
  createEmployee: {
    summary: 'createEmployee',
    description: '',
    tags: ['Employee']
  },
  updateEmployeeProfile: {
    summary: 'updateEmployeeProfile',
    description: '',
    tags: ['Employee']
  },
  changeStatus: {
    summary: 'changeStatus',
    description: '',
    tags: ['Employee']
  },
  changeManager: {
    summary: 'changeManager',
    description: '',
    tags: ['Employee']
  },
  inviteEmployee: {
    summary: 'inviteEmployee',
    description: '',
    tags: ['Employee']
  },
  archiveEmployee: {
    summary: 'archiveEmployee',
    description: '',
    tags: ['Employee']
  },
  restoreEmployee: {
    summary: 'restoreEmployee',
    description: '',
    tags: ['Employee']
  }
};

export class EmployeeController {

  // GET /employees
  async getEmployees(req, res, next) {
    try {
      const result = await EmployeeService.getEmployees(req.query, req.user.organizationId);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  // GET /employees/org-chart
  async getOrgChart(req, res, next) {
    try {
      const chart = await EmployeeService.getOrgChart(req.user.organizationId);
      res.status(200).json({ success: true, data: chart });
    } catch (error) { next(error); }
  }

  // GET /employees/:id
  async getEmployeeById(req, res, next) {
    try {
      const employee = await EmployeeService.getEmployeeById(req.params.id, req.user.organizationId);
      res.status(200).json({ success: true, data: employee });
    } catch (error) { next(error); }
  }

  // POST /employees
  async createEmployee(req, res, next) {
    try {
      const employee = await EmployeeService.createEmployee(req.body, req.user, req.user.organizationId);
      
      // Emit Notification
      await NotificationService.sendNotification(req.user.organizationId, {
        title: 'New Employee Onboarded',
        message: `${employee.firstName} ${employee.lastName} has been successfully onboarded.`,
        priority: 'success',
        targetRoles: ['HR Manager', 'Super Admin', 'IT Admin']
      }).catch(err => console.error('Notification Error:', err));

      res.status(201).json({
        success: true,
        data: employee,
        message: `Employee '${employee.firstName} ${employee.lastName}' created successfully.`
      });
    } catch (error) { next(error); }
  }

  // PATCH /employees/:id/profile
  async updateEmployeeProfile(req, res, next) {
    try {
      const { id } = req.params;
      const employee = await EmployeeService.updateEmployeeProfile(id, req.body, req.user, req.user.organizationId);
      res.status(200).json({
        success: true,
        data: employee,
        message: `Employee profile updated successfully.`
      });
    } catch (error) { next(error); }
  }

  // PUT /employees/:id/status
  async changeStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const employee = await EmployeeService.changeStatus(id, status, reason, req.user, req.user.organizationId);
      res.status(200).json({
        success: true,
        data: employee,
        message: `Employee status changed to '${employee.status}'.`
      });
    } catch (error) { next(error); }
  }

  // PUT /employees/:id/manager
  async changeManager(req, res, next) {
    try {
      const { id } = req.params;
      const { managerId } = req.body;
      const employee = await EmployeeService.changeManager(id, managerId, req.user, req.user.organizationId);
      res.status(200).json({
        success: true,
        data: employee,
        message: `Employee manager updated successfully.`
      });
    } catch (error) { next(error); }
  }

  // POST /employees/:id/invite
  async inviteEmployee(req, res, next) {
    try {
      const { id } = req.params;
      const { roleIds } = req.body;
      const result = await EmployeeService.inviteEmployee(id, roleIds, req.user, req.user.organizationId);
      res.status(200).json({
        success: true,
        data: result,
        message: `Invitation sent to employee successfully.`
      });
    } catch (error) { next(error); }
  }

  // POST /employees/:id/archive
  async archiveEmployee(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      const employee = await EmployeeService.archiveEmployee(id, reason, req.user, req.user.organizationId);
      res.status(200).json({
        success: true,
        data: employee,
        message: `Employee archived successfully.`
      });
    } catch (error) { next(error); }
  }

  // POST /employees/:id/restore
  async restoreEmployee(req, res, next) {
    try {
      const { id } = req.params;
      const employee = await EmployeeService.restoreEmployee(id, req.user, req.user.organizationId);
      res.status(200).json({
        success: true,
        data: employee,
        message: `Employee '${employee.firstName} ${employee.lastName}' restored successfully.`
      });
    } catch (error) { next(error); }
  }
}

export default new EmployeeController();
