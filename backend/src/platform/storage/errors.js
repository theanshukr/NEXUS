import { AppError } from '#@/core/errors/AppError.js';

/**
 * Thrown during storage operations like upload, download, delete failures.
 */
export class StorageError extends AppError {
  constructor(message = 'Storage operation failed.', statusCode = 500, errorCode = 'ERR_STORAGE_FAILURE') {
    super(message, statusCode, errorCode);
  }
}

/**
 * Thrown when an unsupported operation is called on a specific provider (e.g., signed URLs on local storage).
 */
export class UnsupportedOperationError extends AppError {
  constructor(message = 'Operation not supported by the current storage provider.', statusCode = 501, errorCode = 'ERR_UNSUPPORTED_OPERATION') {
    super(message, statusCode, errorCode);
  }
}
