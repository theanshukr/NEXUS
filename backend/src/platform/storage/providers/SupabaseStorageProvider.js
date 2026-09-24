import { createClient } from '@supabase/supabase-js';
import { StorageProvider } from '../StorageProvider.js';
import { STORAGE_CONFIG } from '../config.js';
import { StorageError } from '../errors.js';

export class SupabaseStorageProvider extends StorageProvider {
  constructor() {
    super();
    if (!STORAGE_CONFIG.SUPABASE.URL || !STORAGE_CONFIG.SUPABASE.SECRET_KEY) {
      throw new Error('Supabase credentials are required when STORAGE_PROVIDER is supabase');
    }
    // We use the SECRET_KEY (service role key) since the backend manages all storage authorization
    this.supabase = createClient(
      STORAGE_CONFIG.SUPABASE.URL,
      STORAGE_CONFIG.SUPABASE.SECRET_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    );
    this.bucket = STORAGE_CONFIG.SUPABASE.BUCKET;
  }

  async upload(file, options) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .upload(options.path, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (error) {
        throw error;
      }

      return {
        path: options.path,
        url: null, // Private bucket, no public URL
        size: file.size,
        mimeType: file.mimetype
      };
    } catch (error) {
      throw new StorageError(`Supabase upload failed: ${error.message}`);
    }
  }

  async download(path) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .download(path);

      if (error) {
        throw error;
      }
      
      // Node.js: data is a Blob. Convert to Buffer.
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      throw new StorageError(`Supabase download failed: ${error.message}`);
    }
  }

  async delete(path) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .remove([path]);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      throw new StorageError(`Supabase delete failed: ${error.message}`);
    }
  }

  async createSignedUrl(path, expiresInSeconds) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .createSignedUrl(path, expiresInSeconds);

      if (error) {
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      throw new StorageError(`Supabase createSignedUrl failed: ${error.message}`);
    }
  }
}
