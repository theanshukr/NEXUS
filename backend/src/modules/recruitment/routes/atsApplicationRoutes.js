import { Router } from 'express';
import atsApplicationController from '../controllers/AtsApplicationController.js';
import requireTenant from '#@/core/middleware/tenant.js';
import authenticate from '#@/core/middleware/auth.js';
import hasPermission from '#@/core/middleware/hasPermission.js';
import { PERMISSIONS } from '#@/core/constants/permissions/index.js';
import interviewController from '../controllers/InterviewController.js';
import offerController from '../controllers/OfferController.js';
import jobApplicationController from '../controllers/JobApplicationController.js';

import validate from '#@/core/middleware/validator.js';
import { 
  getApplicationByIdSchema, 
  getApplicationsForRequisitionSchema, 
  advanceStageSchema, 
  rejectApplicationSchema,
  downloadDocumentSchema 
} from '../validators/applicationValidator.js';
import { scheduleInterviewSchema, evaluateInterviewSchema } from '../validators/interview.validator.js';
import { createOfferSchema } from '../validators/offer.validator.js';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(requireTenant);

// All these routes require the user to have permission to view applications
router.use(hasPermission(PERMISSIONS.RECRUITMENT.APPLICATION.VIEW));

router.get('/requisitions/:requisitionId/applications', validate(getApplicationsForRequisitionSchema), atsApplicationController.getApplicationsForRequisition);
router.get('/:id', validate(getApplicationByIdSchema), atsApplicationController.getApplicationDetails);
router.patch('/:id/advance', hasPermission(PERMISSIONS.RECRUITMENT.JOB.EDIT), validate(advanceStageSchema), atsApplicationController.advanceStage);
router.patch('/:id/reject', hasPermission(PERMISSIONS.RECRUITMENT.JOB.EDIT), validate(rejectApplicationSchema), atsApplicationController.rejectApplication);
router.get('/:id/documents/:documentId/download', validate(downloadDocumentSchema), atsApplicationController.downloadCandidateDocument);

router.post('/internal/:id/apply', atsApplicationController.applyInternal);
router.post('/internal/:id/refer', atsApplicationController.referCandidate);

// Interview Routes
router.post('/:id/interviews', hasPermission(PERMISSIONS.RECRUITMENT.JOB.EDIT), validate(scheduleInterviewSchema), interviewController.scheduleInterview);
router.get('/:id/interviews', interviewController.getInterviewsForApplication);
router.get('/:id/interviews/:interviewId', interviewController.getInterview);
router.patch('/:id/interviews/:interviewId', hasPermission(PERMISSIONS.RECRUITMENT.JOB.EDIT), interviewController.updateInterview);
router.delete('/:id/interviews/:interviewId', hasPermission(PERMISSIONS.RECRUITMENT.JOB.EDIT), interviewController.cancelInterview);
router.post('/:id/interviews/:interviewId/evaluate', hasPermission(PERMISSIONS.RECRUITMENT.JOB.EDIT), validate(evaluateInterviewSchema), interviewController.evaluateInterview);

// Offer Routes
router.post('/:id/offers', hasPermission(PERMISSIONS.RECRUITMENT.JOB.EDIT), validate(createOfferSchema), offerController.createOffer);
router.get('/:id/offers', offerController.getOffersForApplication);
router.get('/:id/offers/:offerId', offerController.getOffer);
router.patch('/:id/offers/:offerId/send', hasPermission(PERMISSIONS.RECRUITMENT.JOB.EDIT), offerController.sendOffer);
router.patch('/:id/offers/:offerId/withdraw', hasPermission(PERMISSIONS.RECRUITMENT.JOB.EDIT), offerController.withdrawOffer);

// Hire Route
router.post('/:id/hire', hasPermission(PERMISSIONS.RECRUITMENT.JOB.EDIT), jobApplicationController.hireCandidate);

export default router;
