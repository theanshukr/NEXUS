import { randomUUID } from 'node:crypto';
import { STORAGE_CONFIG } from './config.js';
import { SupabaseStorageProvider } from './providers/SupabaseStorageProvider.js';
import { LocalStorageProvider } from './providers/LocalStorageProvider.js';
import logger from '#@/platform/logger/index.js';

export class StorageService {
  constructor() {
    this.providerName = STORAGE_CONFIG.PROVIDER;
    
    if (this.providerName === 'supabase') {
      this.provider = new SupabaseStorageProvider();
    } else {
      this.provider = new LocalStorageProvider();
    }
    
    logger.info(`StorageService initialized with provider: ${this.providerName}`);
  }

  /**
   * Uploads a file to the configured storage provider.
   * Path generation is managed strictly by this service.
   * 
   * @param {Object} file - Multer file object
   * @param {Object} options - Options containing category
   * @returns {Promise<{ provider: string, bucket: string, path: string, mimeType: string, size: number, uploaded: boolean }>}
   */
  async upload(file, options = {}) {
    const startTime = Date.now();
    const category = options.category || 'misc';
    // Generate a secure, unpredictable path
    const storagePath = `${category}/${randomUUID()}`;
    
    logger.debug({ operation: 'UPLOAD_START', provider: this.providerName, category, size: file.size }, 'Starting file upload');

    const result = await this.provider.upload(file, { path: storagePath });
    
    const duration = Date.now() - startTime;
    
    logger.info({
      operation: 'UPLOAD',
      provider: this.providerName,
      bucket: this.providerName === 'supabase' ? STORAGE_CONFIG.SUPABASE.BUCKET : 'local',
      path: result.path,
      size: result.size,
      duration
    }, 'File uploaded successfully');

    return {
      provider: this.providerName,
      bucket: this.providerName === 'supabase' ? STORAGE_CONFIG.SUPABASE.BUCKET : 'local',
      path: result.path,
      mimeType: result.mimeType,
      size: result.size,
      uploaded: true
    };
  }

  /**
   * Downloads a file from the configured storage provider.
   * 
   * @param {string} path - The path of the file
   * @returns {Promise<Buffer>}
   */
  async download(path) {
    const startTime = Date.now();
    logger.debug({ operation: 'DOWNLOAD_START', provider: this.providerName, path }, 'Starting file download');
    
    const buffer = await this.provider.download(path);
    
    const duration = Date.now() - startTime;
    logger.info({
      operation: 'DOWNLOAD',
      provider: this.providerName,
      path,
      size: buffer.length,
      duration
    }, 'File downloaded successfully');

    return buffer;
  }

  /**
   * Deletes a file from the configured storage provider.
   * 
   * @param {string} path - The path of the file to delete
   * @returns {Promise<boolean>}
   */
  async delete(path) {
    const startTime = Date.now();
    logger.debug({ operation: 'DELETE_START', provider: this.providerName, path }, 'Starting file deletion');
    
    const success = await this.provider.delete(path);
    
    const duration = Date.now() - startTime;
    logger.info({
      operation: 'DELETE',
      provider: this.providerName,
      path,
      duration
    }, 'File deleted successfully');

    return success;
  }

  /**
   * Creates a time-limited signed URL for accessing a private file.
   * 
   * @param {string} path - The path of the file
   * @param {number} expiresInSeconds - Time in seconds until the URL expires
   * @returns {Promise<string>}
   */
  async createSignedUrl(path, expiresInSeconds = 60) {
    const startTime = Date.now();
    logger.debug({ operation: 'SIGNED_URL_START', provider: this.providerName, path, ttl: expiresInSeconds }, 'Generating signed URL');
    
    const url = await this.provider.createSignedUrl(path, expiresInSeconds);
    
    const duration = Date.now() - startTime;
    logger.info({
      operation: 'SIGNED_URL',
      provider: this.providerName,
      path,
      ttl: expiresInSeconds,
      duration
    }, 'Signed URL generated successfully');

    return url;
  }
}

// Export a singleton instance
export const storageService = new StorageService();
