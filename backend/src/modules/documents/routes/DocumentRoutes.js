import express from 'express';
import { authenticate } from '../../../core/middleware/auth.js';
import { requireTenant } from '../../../core/middleware/tenant.js';
import documentController from '../controllers/DocumentController.js';

const router = express.Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', documentController.getAllDocuments);
router.post('/upload', documentController.uploadDocument);

export default router;
