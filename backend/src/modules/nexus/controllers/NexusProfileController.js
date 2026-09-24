import NexusProfileService from '../services/NexusProfileService.js';

class NexusProfileController {
  // GET /api/v1/nexus/employees/:id/profile
  async getProfile(req, res, next) {
    try {
      const { id } = req.params;
      const profile = await NexusProfileService.getUnifiedProfile(id, req.user.organizationId);
      res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/v1/nexus/employees/:id/profile
  async updateProfile(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await NexusProfileService.updateProfile(id, req.body, req.user, req.user.organizationId);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Employee intelligence profile updated successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/nexus/employees/:id/skills
  async addSkill(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await NexusProfileService.addSkill(id, req.body, req.user, req.user.organizationId);
      res.status(201).json({
        success: true,
        data: updated,
        message: `Skill '${req.body.name}' added successfully.`
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/v1/nexus/employees/:id/skills/:skillId
  async updateSkill(req, res, next) {
    try {
      const { id, skillId } = req.params;
      const updated = await NexusProfileService.updateSkill(id, skillId, req.body, req.user, req.user.organizationId);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Skill updated successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/v1/nexus/employees/:id/skills/:skillId
  async removeSkill(req, res, next) {
    try {
      const { id, skillId } = req.params;
      const updated = await NexusProfileService.removeSkill(id, skillId, req.user, req.user.organizationId);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Skill removed successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/nexus/samples/workforce
  async getSampleWorkforce(req, res, next) {
    try {
      const samples = NexusProfileService.getSampleWorkforce();
      res.status(200).json({
        success: true,
        data: samples
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new NexusProfileController();
