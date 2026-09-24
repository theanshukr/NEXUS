import jobRequisitionService from '../services/JobRequisitionService.js';

class JobRequisitionController {
  
  // GET /requisitions
  async getRequisitions(req, res, next) {
    try {
      const requisitions = await jobRequisitionService.getRequisitions(req.query, req.user.organizationId);
      res.status(200).json({
        success: true,
        data: requisitions
      });
    } catch (error) { next(error); }
  }

  // GET /requisitions/:id
  async getRequisitionById(req, res, next) {
    try {
      const { id } = req.params;
      const requisition = await jobRequisitionService.getRequisitionById(id, req.user.organizationId);
      res.status(200).json({
        success: true,
        data: requisition
      });
    } catch (error) { next(error); }
  }

  // POST /requisitions
  async createRequisition(req, res, next) {
    try {
      const requisition = await jobRequisitionService.createRequisition(req.body, req.user.organizationId, req.user.userId);
      res.status(201).json({
        success: true,
        data: requisition,
        message: 'Job Requisition created successfully.'
      });
    } catch (error) { next(error); }
  }

  // PUT /requisitions/:id
  async updateRequisition(req, res, next) {
    try {
      const { id } = req.params;
      const requisition = await jobRequisitionService.updateRequisition(id, req.body, req.user.organizationId, req.user.userId);
      res.status(200).json({
        success: true,
        data: requisition,
        message: 'Job Requisition updated successfully.'
      });
    } catch (error) { next(error); }
  }

  // PATCH /requisitions/:id/submit-approval
  async submitForApproval(req, res, next) {
    try {
      const { id } = req.params;
      const requisition = await jobRequisitionService.submitForApproval(id, req.user.organizationId, req.user.userId);
      res.status(200).json({
        success: true,
        data: requisition,
        message: 'Job Requisition submitted for approval.'
      });
    } catch (error) { next(error); }
  }

  // PATCH /requisitions/:id/approve
  async approveRequisition(req, res, next) {
    try {
      const { id } = req.params;
      const requisition = await jobRequisitionService.approveRequisition(id, req.user.organizationId, req.user);
      res.status(200).json({
        success: true,
        data: requisition,
        message: 'Job Requisition approval step completed.'
      });
    } catch (error) { next(error); }
  }

  // PATCH /requisitions/:id/reject
  async rejectRequisition(req, res, next) {
    try {
      const { id } = req.params;
      const payload = req.body || {};
      const requisition = await jobRequisitionService.rejectRequisition(id, req.user.organizationId, req.user, payload);
      res.status(200).json({
        success: true,
        data: requisition,
        message: 'Job Requisition rejected.'
      });
    } catch (error) { next(error); }
  }

  // PATCH /requisitions/:id/publish
  async publishRequisition(req, res, next) {
    try {
      const { id } = req.params;
      const requisition = await jobRequisitionService.publishRequisition(id, req.user.organizationId, req.user.userId);
      res.status(200).json({
        success: true,
        data: requisition,
        message: 'Job Requisition published successfully.'
      });
    } catch (error) { next(error); }
  }

  // PATCH /requisitions/:id/close
  async closeRequisition(req, res, next) {
    try {
      const { id } = req.params;
      const requisition = await jobRequisitionService.closeRequisition(id, req.user.organizationId, req.user.userId);
      res.status(200).json({
        success: true,
        data: requisition,
        message: 'Job Requisition closed successfully.'
      });
    } catch (error) { next(error); }
  }

  // DELETE /requisitions/:id
  async deleteRequisition(req, res, next) {
    try {
      const { id } = req.params;
      const requisition = await jobRequisitionService.deleteRequisition(id, req.user.organizationId, req.user.userId);
      res.status(200).json({
        success: true,
        data: requisition,
        message: 'Job Requisition archived successfully.'
      });
    } catch (error) { next(error); }
  }
}

export default new JobRequisitionController();
