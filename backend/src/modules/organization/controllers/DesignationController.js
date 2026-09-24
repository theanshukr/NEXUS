import DesignationService from '../services/DesignationService.js';


export const openApiMetadata = {
  getDesignations: {
    summary: 'getDesignations',
    description: '',
    tags: ['Designation']
  },
  getDesignationById: {
    summary: 'getDesignationById',
    description: '',
    tags: ['Designation']
  },
  createDesignation: {
    summary: 'createDesignation',
    description: '',
    tags: ['Designation']
  },
  updateDesignation: {
    summary: 'updateDesignation',
    description: '',
    tags: ['Designation']
  },
  archiveDesignation: {
    summary: 'archiveDesignation',
    description: '',
    tags: ['Designation']
  }
};

export class DesignationController {
  async getDesignations(req, res, next) {
    try {
      const result = await DesignationService.getDesignations(req.query, req.user.organizationId, {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 50
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getDesignationById(req, res, next) {
    try {
      const designation = await DesignationService.getDesignationById(req.params.id, req.user.organizationId);
      res.status(200).json({ success: true, data: designation });
    } catch (error) { next(error); }
  }

  async createDesignation(req, res, next) {
    try {
      const designation = await DesignationService.createDesignation(req.body, req.user, req.user.organizationId);
      res.status(201).json({ success: true, data: designation, message: `Designation '${designation.title}' created.` });
    } catch (error) { next(error); }
  }

  async updateDesignation(req, res, next) {
    try {
      const designation = await DesignationService.updateDesignation(req.params.id, req.body, req.user, req.user.organizationId);
      res.status(200).json({ success: true, data: designation, message: `Designation '${designation.title}' updated.` });
    } catch (error) { next(error); }
  }

  async archiveDesignation(req, res, next) {
    try {
      const { reason } = req.body || {};
      const designation = await DesignationService.archiveDesignation(req.params.id, reason, req.user, req.user.organizationId);
      res.status(200).json({ success: true, data: designation, message: `Designation '${designation.title}' archived.` });
    } catch (error) { next(error); }
  }
}

export default new DesignationController();
