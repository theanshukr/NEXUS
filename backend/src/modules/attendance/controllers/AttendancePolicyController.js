import AttendancePolicyService from '../services/AttendancePolicyService.js';

export const openApiMetadata = {
  getPolicies: { summary: 'List Attendance Policies', description: 'Returns all attendance policies for the organization', tags: ['Attendance Policy'] },
  getPolicyById: { summary: 'Get Attendance Policy', description: 'Returns a single attendance policy by ID', tags: ['Attendance Policy'] },
  createPolicy: { summary: 'Create Attendance Policy', description: 'Creates a new attendance policy', tags: ['Attendance Policy'] },
  updatePolicy: { summary: 'Update Attendance Policy', description: 'Updates an existing attendance policy', tags: ['Attendance Policy'] }
};

export class AttendancePolicyController {
  async getPolicies(req, res, next) {
    try {
      const result = await AttendancePolicyService.getPolicies(req.query, req.user.organizationId, {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getPolicyById(req, res, next) {
    try {
      const policy = await AttendancePolicyService.getPolicyById(req.params.id, req.user.organizationId);
      res.status(200).json({ success: true, data: policy });
    } catch (error) { next(error); }
  }

  async createPolicy(req, res, next) {
    try {
      const policy = await AttendancePolicyService.createPolicy(req.body, req.user, req.user.organizationId);
      res.status(201).json({ success: true, data: policy, message: `Attendance policy '${policy.name}' created.` });
    } catch (error) { next(error); }
  }

  async updatePolicy(req, res, next) {
    try {
      const policy = await AttendancePolicyService.updatePolicy(req.params.id, req.body, req.user, req.user.organizationId);
      res.status(200).json({ success: true, data: policy, message: `Attendance policy '${policy.name}' updated.` });
    } catch (error) { next(error); }
  }
}

export default new AttendancePolicyController();
