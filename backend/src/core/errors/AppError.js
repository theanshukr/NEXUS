/**
 * Base custom error class for the application.
 * Differentiates operational domain errors from unexpected system bugs.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'ERR_INTERNAL_SERVER') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown during authentication failures (invalid credentials, expired tokens, revoked sessions).
 */
export class AuthError extends AppError {
  constructor(message = 'Authentication failed. Please log in again.', statusCode = 401, errorCode = 'ERR_UNAUTHORIZED') {
    super(message, statusCode, errorCode);
  }
}

/**
 * Thrown during RBAC authorization failures (missing required permission or priority violation).
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied: You lack the required permission to perform this action.', statusCode = 403, errorCode = 'ERR_FORBIDDEN') {
    super(message, statusCode, errorCode);
  }
}

/**
 * Fatal security error thrown when a database operation attempts to access data without an organizationId scope.
 */
export class TenantIsolationError extends AppError {
  constructor(message = 'Fatal security violation: Cross-tenant query intercepted without organizationId scope.', statusCode = 403, errorCode = 'ERR_TENANT_BREACH') {
    super(message, statusCode, errorCode);
  }
}

/**
 * Thrown when incoming request data fails Zod or business validation rules.
 */
export class ValidationError extends AppError {
  constructor(message = 'Invalid input data provided.', statusCode = 400, errorCode = 'ERR_VALIDATION', details = null) {
    super(message, statusCode, errorCode);
    this.details = details;
  }
}

/**
 * Thrown when a requested resource (e.g., User, Role, Invitation) cannot be found within the tenant scope.
 */
export class NotFoundError extends AppError {
  constructor(message = 'Requested resource was not found.', statusCode = 404, errorCode = 'ERR_NOT_FOUND') {
    super(message, statusCode, errorCode);
  }
}

/**
 * Thrown when attempting to create a duplicate resource (e.g., existing email or role name).
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict: A record with this unique identifier already exists.', statusCode = 409, errorCode = 'ERR_CONFLICT') {
    super(message, statusCode, errorCode);
  }
}

export default {
  AppError,
  AuthError,
  ForbiddenError,
  TenantIsolationError,
  ValidationError,
  NotFoundError,
  ConflictError
};
