import atsApplicationService from '../services/AtsApplicationService.js';

class AtsApplicationController {
  async getApplicationsForRequisition(req, res, next) {
    try {
      const organizationId = req.tenantContext.organizationId;
      const { requisitionId } = req.params;
      
      const applications = await atsApplicationService.getApplicationsForRequisition(requisitionId, organizationId, req.query);
      res.status(200).json({ success: true, data: applications });
    } catch (error) {
      next(error);
    }
  }

  async getApplicationDetails(req, res, next) {
    try {
      const organizationId = req.tenantContext.organizationId;
      const { id } = req.params;
      
      const details = await atsApplicationService.getApplicationDetails(id, organizationId);
      res.status(200).json({ success: true, data: details });
    } catch (error) {
      next(error);
    }
  }

  async advanceStage(req, res, next) {
    try {
      const organizationId = req.tenantContext.organizationId;
      const { id } = req.params;
      const userId = req.user.userId;
      
      const result = await atsApplicationService.advanceStage(id, organizationId, userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async rejectApplication(req, res, next) {
    try {
      const organizationId = req.tenantContext.organizationId;
      const { id } = req.params;
      const userId = req.user.userId;
      const payload = req.body || {};
      
      const result = await atsApplicationService.rejectApplication(id, organizationId, userId, payload);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async downloadCandidateDocument(req, res, next) {
    try {
      const organizationId = req.tenantContext.organizationId;
      const { id, documentId } = req.params;
      const userPrincipal = req.user;
      
      const { document, buffer } = await atsApplicationService.downloadCandidateDocument(id, documentId, organizationId, userPrincipal);
      
      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalFilename || document.filename}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async applyInternal(req, res, next) {
    try {
      res.status(200).json({ success: true, message: 'Internal application submitted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async referCandidate(req, res, next) {
    try {
      res.status(200).json({ success: true, message: 'Referral submitted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export default new AtsApplicationController();
