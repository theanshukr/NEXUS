import express from 'express';
import { authenticate } from '../../../core/middleware/auth.js';
import { requireTenant } from '../../../core/middleware/tenant.js';
import { hasPermission } from '../../../core/middleware/hasPermission.js';
import assetController from '../controllers/AssetController.js';

const router = express.Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', hasPermission('assets.view'), assetController.getAllAssets);
router.get('/my', assetController.getMyAssets); // Employee can view own
router.post('/', hasPermission('assets.manage'), assetController.createAsset);
router.patch('/:id', hasPermission('assets.manage'), assetController.updateAsset);

export default router;
