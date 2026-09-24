import logger from '#@/platform/logger/index.js';
import { AppError } from '#@/core/errors/AppError.js';
import env from '#@/config/env.js';

/**
 * Global Express Error Handling Middleware
 * Converts operational exceptions and unexpected crashes into standardized JSON error responses.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let errorCode = err.errorCode || 'ERR_INTERNAL_SERVER';
  let message = err.message || 'An unexpected internal server error occurred.';
  let details = err.details || null;

  // 1. Handle Mongoose Duplicate Key Error (e.g., unique email or role name)
  if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'ERR_CONFLICT';
    const field = Object.keys(err.keyValue || {})[0] || 'resource';
    message = `A record with this ${field} already exists.`;
  }

  // 2. Handle Mongoose Schema Validation Error
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    errorCode = 'ERR_VALIDATION';
    message = 'Data validation failed.';
    details = Object.values(err.errors).map(valError => ({
      field: valError.path,
      message: valError.message
    }));
  }

  // 3. Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    errorCode = 'ERR_INVALID_ID';
    message = `Invalid format provided for field '${err.path}'. Expected MongoDB ObjectId.`;
  }

  // 4. Handle Zod Input Validation Error
  if (err.name === 'ZodError') {
    statusCode = 400;
    errorCode = 'ERR_VALIDATION';
    message = 'Input payload validation failed.';
    details = err.errors.map(zodErr => ({
      field: zodErr.path.join('.'),
      message: zodErr.message
    }));
  }

  // 5. Handle JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'ERR_UNAUTHORIZED';
    message = 'Invalid authentication token provided.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'ERR_TOKEN_EXPIRED';
    message = 'Authentication access token has expired.';
  }

  // 6. Log error severity via Pino
  const logPayload = {
    statusCode,
    errorCode,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    correlationId: req.headers['x-correlation-id'] || null,
    userId: req.user?.userId || null,
    tenantId: req.user?.organizationId || null
  };

  if (statusCode >= 500) {
    logger.error({ ...logPayload, stack: err.stack, err }, 'Critical server crash intercepted by errorHandler');
  } else {
    logger.warn({ ...logPayload, message }, 'Operational domain exception returned to client');
  }

  // 7. Render standardized HTTP response
  const responsePayload = {
    success: false,
    error: {
      code: errorCode,
      message,
      status: statusCode,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      ...(details && { details }),
      ...(env.NODE_ENV === 'development' && statusCode >= 500 && { stack: err.stack })
    }
  };

  res.status(statusCode).json(responsePayload);
};

export default errorHandler;
