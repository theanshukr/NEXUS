/**
 * Abstract interface for Storage Providers.
 * All providers (Local, Supabase, etc.) must implement these methods.
 */
export class StorageProvider {
  /**
   * Uploads a file to the storage provider.
   * @param {Object} file - The file object (usually from multer, containing buffer, mimetype, etc.).
   * @param {Object} options - Options containing path, category, etc.
   * @returns {Promise<{ path: string, url: string|null, size: number, mimeType: string }>}
   */
  async upload(file, options) {
    throw new Error('Method "upload" must be implemented.');
  }

  /**
   * Downloads a file from the storage provider.
   * @param {string} path - The path of the file to download.
   * @returns {Promise<Buffer>}
   */
  async download(path) {
    throw new Error('Method "download" must be implemented.');
  }

  /**
   * Deletes a file from the storage provider.
   * @param {string} path - The path of the file to delete.
   * @returns {Promise<boolean>}
   */
  async delete(path) {
    throw new Error('Method "delete" must be implemented.');
  }

  /**
   * Creates a time-limited signed URL for accessing a private file.
   * @param {string} path - The path of the file.
   * @param {number} expiresInSeconds - Time in seconds until the URL expires.
   * @returns {Promise<string>}
   */
  async createSignedUrl(path, expiresInSeconds) {
    throw new Error('Method "createSignedUrl" must be implemented.');
  }
}
