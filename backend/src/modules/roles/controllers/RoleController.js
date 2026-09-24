import RoleService from '#@/modules/roles/services/RoleService.js';
import RbacService from '#@/modules/roles/services/RbacService.js';


export const openApiMetadata = {
  getSystemPermissions: {
    summary: 'getSystemPermissions',
    description: '',
    tags: ['Role']
  },
  getRoles: {
    summary: 'getRoles',
    description: '',
    tags: ['Role']
  },
  createRole: {
    summary: 'createRole',
    description: '',
    tags: ['Role']
  },
  updateRole: {
    summary: 'updateRole',
    description: '',
    tags: ['Role']
  },
  duplicateRole: {
    summary: 'duplicateRole',
    description: '',
    tags: ['Role']
  },
  deleteRole: {
    summary: 'deleteRole',
    description: '',
    tags: ['Role']
  },
  assignRole: {
    summary: 'assignRole',
    description: '',
    tags: ['Role']
  },
  removeRole: {
    summary: 'removeRole',
    description: '',
    tags: ['Role']
  }
};

export class RoleController {
  async getSystemPermissions(req, res, next) {
    try {
      const catalog = RbacService.getSystemPermissionCatalog();
      res.status(200).json({
        success: true,
        data: catalog,
        message: 'Retrieved baseline atomic permission catalog.'
      });
    } catch (error) {
      next(error);
    }
  }

  async getRoles(req, res, next) {
    try {
      const roles = await RoleService.getRoles(req.user.organizationId, { sort: { priority: 1, name: 1 } });
      res.status(200).json({
        success: true,
        data: roles
      });
    } catch (error) {
      next(error);
    }
  }

  async createRole(req, res, next) {
    try {
      const role = await RoleService.createCustomRole(req.body, req.user);
      res.status(201).json({
        success: true,
        data: role,
        message: `Role '${role.name}' created successfully.`
      });
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await RoleService.updateRole(id, req.body, req.user);
      res.status(200).json({
        success: true,
        data: updated,
        message: `Role '${updated.name}' updated successfully.`
      });
    } catch (error) {
      next(error);
    }
  }

  async duplicateRole(req, res, next) {
    try {
      const { id } = req.params;
      const { newName } = req.body;
      const cloned = await RoleService.duplicateRole(id, newName, req.user);
      res.status(201).json({
        success: true,
        data: cloned,
        message: `Role duplicated successfully as '${cloned.name}'.`
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteRole(req, res, next) {
    try {
      const { id } = req.params;
      await RoleService.deleteRole(id, req.user);
      res.status(200).json({
        success: true,
        message: 'Role archived successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  async assignRole(req, res, next) {
    try {
      const { targetUserId, roleId } = req.body;
      const assignment = await RoleService.assignRoleToUser(targetUserId, roleId, req.user);
      res.status(200).json({
        success: true,
        data: assignment,
        message: 'Role assigned to user successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  async removeRole(req, res, next) {
    try {
      const { targetUserId, roleId } = req.body;
      await RoleService.removeRoleFromUser(targetUserId, roleId, req.user);
      res.status(200).json({
        success: true,
        message: 'Role removed from user successfully.'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new RoleController();
