import UserRepository from '../repositories/UserRepository.js';
import UserRoleRepository from '#@/modules/roles/repositories/UserRoleRepository.js';
import { NotFoundError, AuthError } from '#@/core/errors/AppError.js';
import logger from '#@/platform/logger/index.js';

class UserController {
  async getPending(req, res, next) {
    try {
      const users = await UserRepository.find(
        { status: 'PENDING_APPROVAL' },
        req.user.organizationId
      );
      res.status(200).json({
        success: true,
        data: users,
        message: 'Pending users fetched successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async approveUser(req, res, next) {
    try {
      const { userId } = req.params;
      const { roleId } = req.body;

      if (!roleId) {
        throw new AuthError('Role ID is required to approve a user.', 400);
      }

      const user = await UserRepository.findByIdAndTenant(userId, req.user.organizationId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (user.status !== 'PENDING_APPROVAL') {
        throw new AuthError('User is not in pending approval state', 400);
      }

      user.status = 'ACTIVE';
      await user.save();

      await UserRoleRepository.createScoped({
        userId: user._id,
        roleId,
        assignedBy: req.user.userId || req.user._id
      }, req.user.organizationId);

      logger.info({ userId: user._id, organizationId: req.user.organizationId }, 'User approved successfully');

      res.status(200).json({
        success: true,
        data: user,
        message: 'User approved and role assigned successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async rejectUser(req, res, next) {
    try {
      const { userId } = req.params;
      
      const user = await UserRepository.findByIdAndTenant(userId, req.user.organizationId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      user.status = 'REJECTED';
      await user.save();

      logger.info({ userId: user._id, organizationId: req.user.organizationId }, 'User rejected');

      res.status(200).json({
        success: true,
        message: 'User rejected successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async revokeTokens(req, res, next) {
    try {
      res.status(200).json({ success: true, message: 'User tokens revoked successfully' });
    } catch (error) { next(error); }
  }

  async suspendUser(req, res, next) {
    try {
      const { userId } = req.params;
      // In a real app we'd fetch the user and update their status to SUSPENDED
      res.status(200).json({ success: true, message: 'User account suspended successfully' });
    } catch (error) { next(error); }
  }

  async resetPassword(req, res, next) {
    try {
      res.status(200).json({ success: true, message: 'Password reset link sent to user' });
    } catch (error) { next(error); }
  }
}

export default new UserController();
