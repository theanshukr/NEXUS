import { catchAsync } from '../../../core/utils/catchAsync.js';
import { successResponse } from '../../../core/utils/response.js';
import assetService from '../services/AssetService.js';

class AssetController {
  getAllAssets = catchAsync(async (req, res) => {
    const { organizationId } = req.user;
    const assets = await assetService.getAllAssets(organizationId);
    return successResponse(res, assets);
  });

  getMyAssets = catchAsync(async (req, res) => {
    const { organizationId, id: userId } = req.user;
    const assets = await assetService.getMyAssets(organizationId, userId);
    return successResponse(res, assets);
  });

  createAsset = catchAsync(async (req, res) => {
    const { organizationId } = req.user;
    const asset = await assetService.createAsset(organizationId, req.body);
    return successResponse(res, asset, 'Asset created', 201);
  });

  updateAsset = catchAsync(async (req, res) => {
    const { organizationId } = req.user;
    const { id } = req.params;
    const asset = await assetService.updateAsset(organizationId, id, req.body);
    return successResponse(res, asset, 'Asset updated');
  });
}

export default new AssetController();
