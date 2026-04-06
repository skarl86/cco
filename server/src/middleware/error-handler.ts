/**
 * Centralized error handler middleware.
 * Converts HttpError instances to structured JSON responses.
 * Catches unexpected errors and returns generic 500.
 */

import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../errors.js';

interface ErrorResponseBody {
  readonly error: string;
  readonly details?: unknown;
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Known HTTP errors — return structured response
  if (err instanceof HttpError) {
    const body: ErrorResponseBody = { error: err.message };
    if (err.details !== undefined) {
      (body as { details: unknown }).details = err.details;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  // Log unexpected errors via pino (attached by pino-http) or stderr fallback
  const pinoLog = (req as unknown as { log?: { error: (obj: unknown, msg: string) => void } }).log;
  if (pinoLog) {
    pinoLog.error(
      { err, method: req.method, url: req.originalUrl },
      'Unhandled error',
    );
  } else {
    process.stderr.write(
      `[ERROR] ${req.method} ${req.originalUrl}: ${err instanceof Error ? err.message : String(err)}\n`,
    );
  }

  // Never leak internal details to client
  res.status(500).json({ error: 'Internal server error' });
}
