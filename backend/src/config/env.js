import dotenv from 'dotenv';
import { cleanEnv, port, str, num } from 'envalid';

// Load .env variables exactly once at the entry configuration layer
dotenv.config();

/**
 * Validates environment variables using envalid.
 * Application startup fails immediately if required variables are missing or invalid.
 * 
 * Exports a strongly typed environment object.
 */
export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  PORT: port({ default: 5000, desc: 'Port number for the Express server' }),
  MONGODB_URI: str({ desc: 'MongoDB Atlas cluster connection string URL' }),
  JWT_ACCESS_SECRET: str({ default: 'nexusops_access_secret_key_change_in_production_2026', desc: 'Secret key for signing short-lived JWT access tokens' }),
  JWT_REFRESH_SECRET: str({ default: 'nexusops_refresh_secret_key_change_in_production_2026', desc: 'Secret key for verifying refresh tokens' }),
  JWT_CANDIDATE_ACCESS_SECRET: str({ default: 'nexusops_candidate_access_secret_2026', desc: 'Secret key for signing candidate access tokens' }),
  JWT_CANDIDATE_REFRESH_SECRET: str({ default: 'nexusops_candidate_refresh_secret_2026', desc: 'Secret key for verifying candidate refresh tokens' }),
  UPSTASH_REDIS_REST_URL: str({ default: '', desc: 'Upstash Redis REST API URL' }),
  UPSTASH_REDIS_REST_TOKEN: str({ default: '', desc: 'Upstash Redis REST API Token' }),
  CLIENT_URL: str({ default: 'http://localhost:5173', desc: 'Allowed CORS client frontend origin URL' }),
  
  // Storage Configuration
  STORAGE_PROVIDER: str({ choices: ['local', 'supabase'], default: 'local', desc: 'Active storage provider' }),
  LOCAL_STORAGE_PATH: str({ default: 'storage', desc: 'Local storage directory' }),
  SUPABASE_URL: str({ default: '', desc: 'Supabase project URL' }),
  SUPABASE_ANON_KEY: str({ default: '', desc: 'Supabase public anon key' }),
  SUPABASE_SECRET_KEY: str({ default: '', desc: 'Supabase service role secret key' }),
  SUPABASE_STORAGE_BUCKET: str({ default: 'nexusops-storage', desc: 'Supabase default storage bucket' }),
  
  // Storage Limits & Security
  MAX_DOCUMENT_SIZE_MB: num({ default: 10, desc: 'Maximum upload size in MB' }),
  ALLOWED_DOCUMENT_MIME_TYPES: str({ default: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp', desc: 'Comma separated list of allowed MIME types' }),
});

export default env;
