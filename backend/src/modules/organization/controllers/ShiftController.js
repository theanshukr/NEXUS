import ShiftService from '../services/ShiftService.js';


export const openApiMetadata = {
  getShifts: {
    summary: 'getShifts',
    description: '',
    tags: ['Shift']
  },
  getShiftById: {
    summary: 'getShiftById',
    description: '',
    tags: ['Shift']
  },
  createShift: {
    summary: 'createShift',
    description: '',
    tags: ['Shift']
  },
  updateShift: {
    summary: 'updateShift',
    description: '',
    tags: ['Shift']
  },
  archiveShift: {
    summary: 'archiveShift',
    description: '',
    tags: ['Shift']
  }
};

export class ShiftController {
  async getShifts(req, res, next) {
    try {
      const result = await ShiftService.getShifts(req.query, req.user.organizationId, {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 50
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getShiftById(req, res, next) {
    try {
      const shift = await ShiftService.getShiftById(req.params.id, req.user.organizationId);
      res.status(200).json({ success: true, data: shift });
    } catch (error) { next(error); }
  }

  async createShift(req, res, next) {
    try {
      const shift = await ShiftService.createShift(req.body, req.user, req.user.organizationId);
      res.status(201).json({ success: true, data: shift, message: `Shift '${shift.name}' created.` });
    } catch (error) { next(error); }
  }

  async updateShift(req, res, next) {
    try {
      const shift = await ShiftService.updateShift(req.params.id, req.body, req.user, req.user.organizationId);
      res.status(200).json({ success: true, data: shift, message: `Shift '${shift.name}' updated.` });
    } catch (error) { next(error); }
  }

  async archiveShift(req, res, next) {
    try {
      const { reason } = req.body || {};
      const shift = await ShiftService.archiveShift(req.params.id, reason, req.user, req.user.organizationId);
      res.status(200).json({ success: true, data: shift, message: `Shift '${shift.name}' archived.` });
    } catch (error) { next(error); }
  }
}

export default new ShiftController();
