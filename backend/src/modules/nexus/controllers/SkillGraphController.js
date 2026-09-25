import { catchAsync } from '../../../core/utils/catchAsync.js';
import skillGraphService from '../services/SkillGraphService.js';
import { AppError } from '../../../core/errors/AppError.js';

class SkillGraphController {
  /**
   * GET /api/v1/nexus/skill-graph
   * Retrieves the workforce skill graph for the current organization.
   */
  getGraph = catchAsync(async (req, res) => {
    const { organizationId } = req.user;
    
    if (!organizationId) {
      throw new AppError('Organization ID is required', 400);
    }

    const { employeeId, skillId, designationId, projectId, departmentId } = req.query;

    const graph = await skillGraphService.getSkillGraph(organizationId, {
      employeeId,
      skillId,
      designationId,
      projectId,
      departmentId
    });

    res.status(200).json(graph);
  });
}

export default new SkillGraphController();
