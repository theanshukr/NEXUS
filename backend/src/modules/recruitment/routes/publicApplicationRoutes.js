import { Router } from 'express';
import multer from 'multer';
import jobApplicationController from '../controllers/JobApplicationController.js';
import interviewController from '../controllers/InterviewController.js';
import offerController from '../controllers/OfferController.js';
import candidateRequireTenant from '#@/core/middleware/candidateTenant.js';
import candidateAuthenticate from '#@/core/middleware/candidateAuth.js';
import env from '#@/config/env.js';
import { ValidationError } from '#@/core/errors/AppError.js';
import validate from '#@/core/middleware/validator.js';
import { applyJobSchema } from '../validators/applicationValidator.js';

const router = Router({ mergeParams: true });

// Configure multer for memory storage (file buffer passed to DocumentService)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_DOCUMENT_SIZE_MB * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = env.ALLOWED_DOCUMENT_MIME_TYPES.split(',');
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError(`File type ${file.mimetype} is not allowed.`), false);
    }
  }
});

router.use(candidateRequireTenant);
router.use(candidateAuthenticate);

// Apply for a job posting (multipart/form-data)
router.post(
  '/:slugOrId',
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 }
  ]),
  validate(applyJobSchema),
  jobApplicationController.apply
);

// Get my applications
router.get(
  '/',
  jobApplicationController.getMyApplications
);

// Withdraw application
router.patch(
  '/:id/withdraw',
  jobApplicationController.withdrawApplication
);

// Candidate Interview Routes
router.get(
  '/interviews',
  interviewController.getCandidateInterviews
);

// Candidate Offer Routes
router.get(
  '/offers',
  offerController.getCandidateOffers
);
router.patch(
  '/offers/:id/accept',
  offerController.acceptOffer
);
router.patch(
  '/offers/:id/decline',
  offerController.declineOffer
);

export default router;
