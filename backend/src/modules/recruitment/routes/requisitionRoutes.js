import { Router } from 'express';
import { authenticate } from '#@/core/middleware/auth.js';
import { requireTenant } from '#@/core/middleware/tenant.js';
import { hasPermission } from '#@/core/middleware/hasPermission.js';
import validate from '#@/core/middleware/validator.js';
import { PERMISSIONS } from '#@/core/constants/permissions/index.js';
import jobRequisitionController from '../controllers/JobRequisitionController.js';
import {
  createRequisitionSchema,
  updateRequisitionSchema,
  getRequisitionByIdSchema,
  rejectRequisitionSchema
} from '../validators/requisitionValidator.js';

const router = Router();

// Secure all routes with authentication and tenant context
router.use(authenticate);
router.use(requireTenant);

// Job Requisition Management Routes
router.get(
  '/', 
  hasPermission(PERMISSIONS.RECRUITMENT.JOB.VIEW), 
  jobRequisitionController.getRequisitions
);

router.get(
  '/:id', 
  hasPermission(PERMISSIONS.RECRUITMENT.JOB.VIEW),
  validate(getRequisitionByIdSchema), 
  jobRequisitionController.getRequisitionById
);

router.post(
  '/', 
  hasPermission(PERMISSIONS.RECRUITMENT.JOB.CREATE), 
  validate(createRequisitionSchema),
  jobRequisitionController.createRequisition
);

router.put(
  '/:id', 
  hasPermission(PERMISSIONS.RECRUITMENT.JOB.EDIT), 
  validate(updateRequisitionSchema),
  jobRequisitionController.updateRequisition
);

router.patch(
  '/:id/submit-approval', 
  hasPermission(PERMISSIONS.RECRUITMENT.JOB.EDIT), 
  validate(getRequisitionByIdSchema),
  jobRequisitionController.submitForApproval
);

router.patch(
  '/:id/approve', 
  hasPermission(PERMISSIONS.RECRUITMENT.JOB.APPROVE), 
  validate(getRequisitionByIdSchema),
  jobRequisitionController.approveRequisition
);

router.patch(
  '/:id/reject', 
  hasPermission(PERMISSIONS.RECRUITMENT.JOB.APPROVE), 
  validate(rejectRequisitionSchema),
  jobRequisitionController.rejectRequisition
);

router.patch(
  '/:id/publish', 
  hasPermission(PERMISSIONS.RECRUITMENT.JOB.PUBLISH), 
  validate(getRequisitionByIdSchema),
  jobRequisitionController.publishRequisition
);

router.patch(
  '/:id/close', 
  hasPermission(PERMISSIONS.RECRUITMENT.JOB.EDIT), 
  validate(getRequisitionByIdSchema),
  jobRequisitionController.closeRequisition
);

router.delete(
  '/:id', 
  hasPermission(PERMISSIONS.RECRUITMENT.JOB.DELETE), 
  validate(getRequisitionByIdSchema),
  jobRequisitionController.deleteRequisition
);

export default router;
