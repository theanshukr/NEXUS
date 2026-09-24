import offerService from '../services/OfferService.js';
import { createOfferSchema } from '../validators/offer.validator.js';
import { validate } from '#@/core/middleware/validator.js';

export class OfferController {
  async createOffer(req, res, next) {
    try {
      const offer = await offerService.createOffer(req.params.id, req.tenantContext.organizationId, req.body, req.user);
      return res.status(201).json({ success: true, data: offer });
    } catch (error) {
      next(error);
    }
  }

  async getOffersForApplication(req, res, next) {
    try {
      const offers = await offerService.getOffers(req.params.id, req.tenantContext.organizationId);
      return res.status(200).json({ success: true, data: offers });
    } catch (error) {
      next(error);
    }
  }

  async getOffer(req, res, next) {
    try {
      const offer = await offerService.getOfferById(req.params.offerId, req.tenantContext.organizationId);
      return res.status(200).json({ success: true, data: offer });
    } catch (error) {
      next(error);
    }
  }

  async sendOffer(req, res, next) {
    try {
      const offer = await offerService.sendOffer(req.params.offerId, req.tenantContext.organizationId, req.user);
      return res.status(200).json({ success: true, data: offer });
    } catch (error) {
      next(error);
    }
  }

  async withdrawOffer(req, res, next) {
    try {
      const offer = await offerService.withdrawOffer(req.params.offerId, req.tenantContext.organizationId, req.user);
      return res.status(200).json({ success: true, data: offer });
    } catch (error) {
      next(error);
    }
  }

  // --- Candidate endpoints ---

  async getCandidateOffers(req, res, next) {
    try {
      const offers = await offerService.getCandidateOffers(req.candidate.candidateId, req.tenantContext.organizationId);
      return res.status(200).json({ success: true, data: offers });
    } catch (error) {
      next(error);
    }
  }

  async acceptOffer(req, res, next) {
    try {
      const offer = await offerService.acceptOffer(req.params.id, req.candidate.candidateId, req.tenantContext.organizationId);
      return res.status(200).json({ success: true, data: offer });
    } catch (error) {
      next(error);
    }
  }

  async declineOffer(req, res, next) {
    try {
      const offer = await offerService.declineOffer(req.params.id, req.candidate.candidateId, req.tenantContext.organizationId);
      return res.status(200).json({ success: true, data: offer });
    } catch (error) {
      next(error);
    }
  }
}

export const openApiMetadata = {
  getCandidateOffers: {
    security: [{ BearerAuth: [] }]
  },
  acceptOffer: {
    security: [{ BearerAuth: [] }]
  },
  declineOffer: {
    security: [{ BearerAuth: [] }]
  }
};

export default new OfferController();
