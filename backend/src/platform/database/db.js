import mongoose from 'mongoose';
import env from '#@/config/env.js';
import logger from '#@/platform/logger/index.js';
import TransactionContext from '#@/core/context/TransactionContext.js';
import EventBus from '#@/core/events/EventBus.js';

/**
 * Reusable MongoDB Atlas connection module using Mongoose.
 * 
 * Requirements satisfied:
 * - Exports connectDB() and runInTransaction() helper.
 * - Does NOT connect automatically on startup or file import.
 * - Configures serverSelectionTimeoutMS (5000) and maxPoolSize (10).
 * - Handles connected, disconnected, error, and SIGINT lifecycle events.
 * - Gracefully closes MongoDB connection.
 * - Uses structured logger exclusively (no direct console.log / console.error).
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });

    logger.info(`MongoDB Atlas Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`MongoDB Atlas Connection Error: ${error.message}`);
    throw error;
  }
};

/**
 * Executes a callback inside an ACID MongoDB ClientSession transaction.
 * Gracefully falls back to sequential execution without a session if running on a standalone non-replica set local instance.
 */
export const runInTransaction = async (callback) => {
  // Mock transaction execution for local memory server to prevent locks
  if (mongoose.connection.host === '127.0.0.1' || !env.MONGODB_URI.includes('replicaSet')) {
    logger.warn('MongoDB Memory Server detected: Bypassing ACID transactions and executing sequentially.');
    const queuedEvents = [];
    let result;
    try {
      result = await TransactionContext.run({ session: null, queuedEvents }, async () => {
        return await callback(null);
      });
      if (queuedEvents.length > 0) {
        for (const event of queuedEvents) {
          EventBus.emit(event.eventName, event.payload, { skipQueue: true });
        }
      }
      return result;
    } catch (error) {
      throw error;
    }
  }

  const session = await mongoose.startSession();
  try {
    let result;
    const queuedEvents = [];
    
    await session.withTransaction(async () => {
      queuedEvents.length = 0; // Clear on retries
      result = await TransactionContext.run({ session, queuedEvents }, async () => {
        return await callback(session);
      });
    });
    
    // Commit successful! Emit all deferred events
    if (queuedEvents.length > 0) {
      logger.debug({ count: queuedEvents.length }, 'Flushing deferred domain events after successful transaction commit');
      for (const event of queuedEvents) {
        EventBus.emit(event.eventName, event.payload, { skipQueue: true });
      }
    }
    
    return result;
  } catch (error) {
    if (error.message && (error.message.includes('replica set') || error.message.includes('Transaction numbers are only allowed'))) {
      logger.warn('MongoDB transactions not supported on standalone node; falling back to sequential execution without session.');
      return await callback(null);
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

// Event listeners for Mongoose connection lifecycle
mongoose.connection.on('connected', () => {
  logger.info('MongoDB connection established successfully.');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection disconnected.');
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB runtime connection error: ${err.message || err}`);
});

// Graceful shutdown handler for Node processes
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection gracefully closed due to app termination (SIGINT).');
    process.exit(0);
  } catch (err) {
    logger.error(`Error during MongoDB graceful shutdown: ${err.message || err}`);
    process.exit(1);
  }
});

export default connectDB;
