import LocationService from '../services/LocationService.js';


export const openApiMetadata = {
  getLocations: {
    summary: 'getLocations',
    description: '',
    tags: ['Location']
  },
  getLocationById: {
    summary: 'getLocationById',
    description: '',
    tags: ['Location']
  },
  createLocation: {
    summary: 'createLocation',
    description: '',
    tags: ['Location']
  },
  updateLocation: {
    summary: 'updateLocation',
    description: '',
    tags: ['Location']
  },
  archiveLocation: {
    summary: 'archiveLocation',
    description: '',
    tags: ['Location']
  }
};

export class LocationController {
  async getLocations(req, res, next) {
    try {
      const result = await LocationService.getLocations(req.query, req.user.organizationId, {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 50
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getLocationById(req, res, next) {
    try {
      const location = await LocationService.getLocationById(req.params.id, req.user.organizationId);
      res.status(200).json({ success: true, data: location });
    } catch (error) { next(error); }
  }

  async createLocation(req, res, next) {
    try {
      const location = await LocationService.createLocation(req.body, req.user, req.user.organizationId);
      res.status(201).json({ success: true, data: location, message: `Location '${location.name}' created.` });
    } catch (error) { next(error); }
  }

  async updateLocation(req, res, next) {
    try {
      const location = await LocationService.updateLocation(req.params.id, req.body, req.user, req.user.organizationId);
      res.status(200).json({ success: true, data: location, message: `Location '${location.name}' updated.` });
    } catch (error) { next(error); }
  }

  async archiveLocation(req, res, next) {
    try {
      const { reason } = req.body || {};
      const location = await LocationService.archiveLocation(req.params.id, reason, req.user, req.user.organizationId);
      res.status(200).json({ success: true, data: location, message: `Location '${location.name}' archived.` });
    } catch (error) { next(error); }
  }
}

export default new LocationController();
