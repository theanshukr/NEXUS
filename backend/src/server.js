import env from '#@/config/env.js';
import connectDB from '#@/platform/database/db.js';
import logger from '#@/platform/logger/index.js';
import app from '#@/app.js';

/**
 * Server Entry Point.
 * 
 * Architecture rules:
 * - Loads validated environment configuration.
 * - Establishes MongoDB Atlas connection.
 * - Starts the Express HTTP server.
 */
const startServer = async () => {
  try {
    // 1. Establish database connection
    await connectDB();

    // 2. Start Express HTTP listening server
    const server = app.listen(env.PORT, () => {
      logger.info(`HTTP Server listening on port ${env.PORT}`);
    });

    // Gracefully handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.error(`Unhandled Promise Rejection: ${err.message || err}`);
      server.close(() => process.exit(1));
    });

  } catch (error) {
    logger.error(`Fatal error starting HTTP server: ${error.message || error}`);
    process.exit(1);
  }
};

startServer();
