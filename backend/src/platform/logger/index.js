import pino from 'pino';

/**
 * Production-grade structured logger using Pino.
 * Replaces all raw console.log and console.error calls across the infrastructure.
 */
export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
