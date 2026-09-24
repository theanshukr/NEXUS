import { NotFoundError, ValidationError, ForbiddenError } from '#@/core/errors/AppError.js';
import { runInTransaction } from '#@/platform/database/db.js';
import Offer from '../models/Offer.js';
import JobApplication from '../models/JobApplication.js';
import ApplicationHistory from '../models/ApplicationHistory.js';
import ApplicationWorkflowInstance from '../models/ApplicationWorkflowInstance.js';

export class OfferService {
  async createOffer(applicationId, organizationId, payload, userContext) {
    const application = await JobApplication.findOne({ _id: applicationId, organizationId });
    if (!application) {
      throw new NotFoundError('Job application not found.');
    }

    if (['HIRED', 'REJECTED', 'WITHDRAWN'].includes(application.status)) {
      throw new ValidationError(`Cannot create an offer for application in ${application.status} status.`);
    }

    const offer = new Offer({
      organizationId,
      applicationId,
      candidateId: application.candidateId,
      salary: payload.salary,
      designationId: payload.designationId,
      departmentId: payload.departmentId,
      joiningDate: payload.joiningDate,
      offerExpiry: payload.offerExpiry,
      notes: payload.notes,
      status: 'DRAFT',
      createdBy: userContext.userId
    });

    await runInTransaction(async (session) => {
      await offer.save({ session });
      
      const history = new ApplicationHistory({
        applicationId,
        organizationId,
        action: 'Offer Created',
        performedBy: userContext.userId,
        performedByType: 'User',
        comment: `Draft offer created for candidate`
      });
      await history.save({ session });
    });

    return offer;
  }

  async sendOffer(offerId, organizationId, userContext) {
    const offer = await Offer.findOne({ _id: offerId, organizationId });
    if (!offer) throw new NotFoundError('Offer not found.');
    if (offer.status !== 'DRAFT') {
      throw new ValidationError(`Cannot send offer in ${offer.status} status.`);
    }

    offer.status = 'PENDING_RESPONSE';
    offer.updatedBy = userContext.userId;

    await runInTransaction(async (session) => {
      await offer.save({ session });
      
      const application = await JobApplication.findById(offer.applicationId).session(session);
      application.status = 'OFFER';
      await application.save({ session });

      const history = new ApplicationHistory({
        applicationId: offer.applicationId,
        organizationId,
        action: 'Offer Sent',
        performedBy: userContext.userId,
        performedByType: 'User',
        comment: `Offer sent to candidate`
      });
      await history.save({ session });
    });

    // TODO: Send email notification to candidate with offer details

    return offer;
  }

  async withdrawOffer(offerId, organizationId, userContext) {
    const offer = await Offer.findOne({ _id: offerId, organizationId });
    if (!offer) throw new NotFoundError('Offer not found.');
    if (['ACCEPTED', 'DECLINED', 'WITHDRAWN'].includes(offer.status)) {
      throw new ValidationError(`Cannot withdraw offer in ${offer.status} status.`);
    }

    offer.status = 'WITHDRAWN';
    offer.updatedBy = userContext.userId;

    await runInTransaction(async (session) => {
      await offer.save({ session });

      const history = new ApplicationHistory({
        applicationId: offer.applicationId,
        organizationId,
        action: 'Offer Withdrawn',
        performedBy: userContext.userId,
        performedByType: 'User',
        comment: `Offer withdrawn by HR`
      });
      await history.save({ session });
    });

    // TODO: Send email notification for offer withdrawal

    return offer;
  }

  async getOffers(applicationId, organizationId) {
    return await Offer.find({ applicationId, organizationId }).sort({ createdAt: -1 });
  }

  async getOfferById(offerId, organizationId) {
    const offer = await Offer.findOne({ _id: offerId, organizationId });
    if (!offer) throw new NotFoundError('Offer not found.');
    return offer;
  }

  // --- Candidate APIs ---

  async getCandidateOffers(candidateId, organizationId, applicationId = null) {
    const query = { candidateId, organizationId, status: { $ne: 'DRAFT' } }; // Candidates shouldn't see draft offers
    if (applicationId) {
      query.applicationId = applicationId;
    }
    return await Offer.find(query).sort({ createdAt: -1 });
  }

  async acceptOffer(offerId, candidateId, organizationId) {
    const offer = await Offer.findOne({ _id: offerId, candidateId, organizationId });
    if (!offer) throw new NotFoundError('Offer not found.');
    
    if (offer.status !== 'SENT' && offer.status !== 'PENDING_RESPONSE') {
      throw new ValidationError(`Cannot accept offer in ${offer.status} status.`);
    }
    
    if (new Date(offer.offerExpiry) < new Date()) {
      offer.status = 'EXPIRED';
      await offer.save();
      throw new ValidationError('Offer has expired.');
    }

    offer.status = 'ACCEPTED';

    await runInTransaction(async (session) => {
      await offer.save({ session });

      const history = new ApplicationHistory({
        applicationId: offer.applicationId,
        organizationId,
        action: 'Offer Accepted',
        performedBy: candidateId,
        performedByType: 'Candidate',
        comment: `Candidate accepted the offer`
      });
      await history.save({ session });
    });

    // TODO: Send email notification to HR

    return offer;
  }

  async declineOffer(offerId, candidateId, organizationId) {
    const offer = await Offer.findOne({ _id: offerId, candidateId, organizationId });
    if (!offer) throw new NotFoundError('Offer not found.');
    
    if (offer.status !== 'SENT' && offer.status !== 'PENDING_RESPONSE') {
      throw new ValidationError(`Cannot decline offer in ${offer.status} status.`);
    }

    offer.status = 'DECLINED';

    await runInTransaction(async (session) => {
      await offer.save({ session });

      const history = new ApplicationHistory({
        applicationId: offer.applicationId,
        organizationId,
        action: 'Offer Declined',
        performedBy: candidateId,
        performedByType: 'Candidate',
        comment: `Candidate declined the offer`
      });
      await history.save({ session });
    });

    // TODO: Send email notification to HR

    return offer;
  }
}

export default new OfferService();
