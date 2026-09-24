import assetRepo from '../repositories/AssetRepository.js';

class AssetService {
  async getAllAssets(organizationId) {
    return assetRepo.findByOrganization(organizationId, {}, { sort: { createdAt: -1 } });
  }

  async getMyAssets(organizationId, userId) {
    return assetRepo.findByOrganization(organizationId, { assignedTo: userId });
  }

  async createAsset(organizationId, data) {
    return assetRepo.create({ organizationId, ...data });
  }

  async updateAsset(organizationId, assetId, data) {
    const asset = await assetRepo.findById(assetId);
    if (!asset || asset.organizationId.toString() !== organizationId.toString()) {
      throw new Error('Asset not found');
    }
    
    if (data.assignedTo) asset.assignedTo = data.assignedTo;
    if (data.status) asset.status = data.status;
    
    return asset.save();
  }
}

export default new AssetService();
