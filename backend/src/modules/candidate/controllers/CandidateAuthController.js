import candidateAuthService from '../services/CandidateAuthService.js';

class CandidateAuthController {
  async register(req, res, next) {
    try {
      const organizationId = req.tenantContext.organizationId;
      const result = await candidateAuthService.register(organizationId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const organizationId = req.tenantContext.organizationId;
      const { email, password } = req.body;
      
      // We don't have extractClientInfo yet, let's mock or implement it inline
      const requestInfo = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'Unknown Agent',
        deviceId: req.headers['x-device-id'] || 'Unknown ID',
        deviceName: req.headers['x-device-name'] || 'Unknown Device'
      };
      
      const result = await candidateAuthService.login(organizationId, email, password, requestInfo);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const organizationId = req.tenantContext.organizationId;
      const candidateId = req.candidate.candidateId;
      const sessionId = req.candidate.sessionId;
      
      await candidateAuthService.logout(organizationId, candidateId, sessionId);
      res.status(200).json({ success: true, message: 'Logged out successfully.' });
    } catch (error) {
      next(error);
    }
  }
}

export const openApiMetadata = {
  register: {
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              password: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' }
            },
            required: ['email', 'password', 'firstName', 'lastName']
          }
        }
      }
    }
  },
  login: {
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              password: { type: 'string' }
            },
            required: ['email', 'password']
          }
        }
      }
    }
  },
  logout: {
    security: [{ BearerAuth: [] }]
  }
};

export default new CandidateAuthController();
