import fs from 'fs/promises';
import path from 'path';
import { StorageProvider } from '../StorageProvider.js';
import { STORAGE_CONFIG } from '../config.js';
import { StorageError, UnsupportedOperationError } from '../errors.js';
import logger from '#@/platform/logger/index.js';

export class LocalStorageProvider extends StorageProvider {
  constructor() {
    super();
    this.basePath = path.resolve(process.cwd(), STORAGE_CONFIG.LOCAL.PATH);
    this._ensureBasePath();
  }

  async _ensureBasePath() {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      logger.error(`Failed to create local storage base path: ${error.message}`);
    }
  }

  async upload(file, options) {
    try {
      const fullPath = path.join(this.basePath, options.path);
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(fullPath, file.buffer);
      
      return {
        path: options.path,
        url: null, // Local storage doesn't provide direct public URLs easily without a serving route
        size: file.size,
        mimeType: file.mimetype
      };
    } catch (error) {
      throw new StorageError(`Local upload failed: ${error.message}`);
    }
  }

  async download(targetPath) {
    try {
      const fullPath = path.join(this.basePath, targetPath);
      const buffer = await fs.readFile(fullPath);
      return buffer;
    } catch (error) {
      throw new StorageError(`Local download failed: ${error.message}`);
    }
  }

  async delete(targetPath) {
    try {
      const fullPath = path.join(this.basePath, targetPath);
      
      // Check if file exists first to return success if already deleted (idempotent)
      try {
        await fs.access(fullPath);
      } catch (err) {
        if (err.code === 'ENOENT') return true;
        throw err;
      }

      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      throw new StorageError(`Local delete failed: ${error.message}`);
    }
  }

  async createSignedUrl(targetPath, expiresInSeconds) {
    throw new UnsupportedOperationError('createSignedUrl is not supported by LocalStorageProvider.');
  }
}
