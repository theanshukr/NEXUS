import AuthService from '#@/modules/auth/services/AuthService.js';
import TokenService from '#@/modules/auth/services/TokenService.js';
import InviteService from '#@/modules/invitations/services/InviteService.js';
import env from '#@/config/env.js';
import logger from '#@/platform/logger/index.js';

const REFRESH_COOKIE_NAME = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
};

export const openApiMetadata = {
  login: {
    summary: 'Login User',
    description: 'Authenticates a user and returns access and refresh tokens.',
    tags: ['Auth']
  },
  refresh: {
    summary: 'Refresh Session',
    description: 'Rotates the refresh token and returns a new access token.',
    tags: ['Auth']
  },
  logout: {
    summary: 'Logout User',
    description: 'Revokes the current session and clears the refresh token.',
    tags: ['Auth']
  },
  registerViaInvite: {
    summary: 'Register via Invitation',
    description: 'Redeems an invitation token to create a new user account.',
    tags: ['Auth']
  },
  getMe: {
    summary: 'Get Current User',
    description: 'Returns the currently authenticated user profile and permissions.',
    tags: ['Auth']
  }
};

export class AuthController {
  async login(req, res, next) {
    try {
      const { email, password, organizationCode } = req.body;
      const result = await AuthService.login(email, password, organizationCode, req);

      // Set secure HttpOnly cookie for automated token rotation
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, COOKIE_OPTIONS);

      res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken, // Also return in JSON for mobile/SDK clients
          user: result.user
        },
        message: 'Logged in successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      // Extract token from cookie first; fallback to req.body for non-browser SDKs
      const plaintextToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      const result = await TokenService.rotateRefreshToken(plaintextToken, req);

      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, COOKIE_OPTIONS);

      res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user
        },
        message: 'Access token refreshed successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const refreshTokenCookie = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      await AuthService.logout(req.user, refreshTokenCookie);

      res.clearCookie(REFRESH_COOKIE_NAME, COOKIE_OPTIONS);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  async registerViaInvite(req, res, next) {
    try {
      const result = await InviteService.registerViaInvite(req.body, req);

      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, COOKIE_OPTIONS);

      res.status(201).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user
        },
        message: 'Account registered successfully via invitation.'
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const User = (await import('#@/modules/users/models/User.js')).default;
      const user = await User.findOne({ _id: req.user.userId, organizationId: req.user.organizationId }).select('-passwordHash');
      const permissions = await (await import('#@/modules/roles/services/RbacService.js')).default.getEffectivePermissions(req.user.userId, req.user.organizationId);
      await import('#@/modules/roles/models/Role.js');
      const UserRoleRepository = (await import('#@/modules/roles/repositories/UserRoleRepository.js')).default;
      const userRolesDocs = await UserRoleRepository.findRolesByUser(req.user.userId, req.user.organizationId);
      const roles = userRolesDocs.map(ur => ur.roleId?.name).filter(Boolean);
      
      const userData = user.toObject ? user.toObject() : user;
      userData.roles = roles;

      res.status(200).json({
        success: true,
        data: {
          user: userData,
          permissions: Array.from(permissions)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async employeeSignup(req, res, next) {
    try {
      const user = await AuthService.employeeSignup(req.body);
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            status: user.status
          }
        },
        message: 'Signup successful. Your account is pending administrator approval.'
      });
    } catch (error) {
      next(error);
    }
  }

}

export default new AuthController();
