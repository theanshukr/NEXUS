import connectDB from '#@/platform/database/db.js';
import logger from '#@/platform/logger/index.js';
import mongoose from 'mongoose';

let replSet = null;

export async function connectWithFallback() {
  try {
    await connectDB();
  } catch (err) {
    logger.warn('MongoDB Atlas connection failed. Launching local MongoMemoryReplSet...');
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri(), { serverSelectionTimeoutMS: 10000 });
    logger.info('Connected to in-memory MongoDB replica set.');
  }
  return replSet;
}

export async function disconnectWithFallback() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (replSet) {
    await replSet.stop();
    replSet = null;
  }
}
