import pino from 'pino';
import env from '#ai/config/env.js';

/**
 * Structured Pino logger for the AI Platform.
 * Emits JSON in production, human-readable pretty output in development.
 * Never use console.log — always import this logger.
 */
const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  base: { service: 'nexusops-ai-platform' },
  ...(env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname,service',
      },
    },
  }),
});

export default logger;
