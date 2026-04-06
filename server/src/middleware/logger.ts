/**
 * Pino HTTP request logger with sensitive data redaction.
 */

import pino from 'pino';
import pinoHttp from 'pino-http';

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.body.value',
  'req.body.contentBase64',
  'req.body.password',
];

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

export const httpLogger = pinoHttp({
  logger,
  // Skip health check from request logs to reduce noise
  autoLogging: {
    ignore: (req) => req.url === '/api/health',
  },
  // Customize serializers to avoid logging large bodies
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});
