import mongoose from 'mongoose';
import env from '#ai/config/env.js';
import logger from '#ai/platform/logger.js';

/**
 * MongoDB connection for AI-owned collections.
 * Connects to the same Atlas cluster as the backend but uses a separate
 * DB name (nexusops_ai by default) to avoid schema ownership conflicts.
 *
 * AI-owned collections:
 *   - ai_audit_logs      (immutable conversation/tool audit trail)
 *   - ai_usage_ledger    (per-user/org token cost accounting)
 *   - document_chunks    (RAG vector store)
 */

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
      maxPoolSize: 10,
    });

    isConnected = true;
    logger.info({ host: conn.connection.host, db: env.MONGODB_DB_NAME }, '[AI DB] MongoDB connected');
  } catch (error) {
    logger.error({ err: error }, '[AI DB] MongoDB connection failed');
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info('[AI DB] MongoDB disconnected');
};

export default mongoose;
