import InviteService from '#@/modules/invitations/services/InviteService.js';


export const openApiMetadata = {
  createInvite: {
    summary: 'createInvite',
    description: '',
    tags: ['Invite']
  },
  getInvites: {
    summary: 'getInvites',
    description: '',
    tags: ['Invite']
  },
  revokeInvite: {
    summary: 'revokeInvite',
    description: '',
    tags: ['Invite']
  },
  validateToken: {
    summary: 'validateToken',
    description: '',
    tags: ['Invite']
  }
};

export class InviteController {
  async createInvite(req, res, next) {
    try {
      const invite = await InviteService.createInvitation(req.body, req.user);
      res.status(201).json({
        success: true,
        data: invite,
        message: 'Invitation generated successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  async getInvites(req, res, next) {
    try {
      const invites = await InviteService.getInvitations(req.user.organizationId);
      res.status(200).json({
        success: true,
        data: invites
      });
    } catch (error) {
      next(error);
    }
  }

  async revokeInvite(req, res, next) {
    try {
      const { id } = req.params;
      const revoked = await InviteService.revokeInvitation(id, req.user.organizationId);
      res.status(200).json({
        success: true,
        data: revoked,
        message: 'Invitation revoked successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  async validateToken(req, res, next) {
    try {
      const { token } = req.params;
      const invite = await InviteService.validateInvitationToken(token);
      res.status(200).json({
        success: true,
        data: {
          email: invite.email,
          defaultRoles: invite.defaultRoleIds,
          expiresAt: invite.expiresAt
        },
        message: 'Invitation token is valid and active.'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new InviteController();
