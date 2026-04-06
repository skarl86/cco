/**
 * Zod validation middleware for Express routes.
 * Validates request body, query, and/or params against Zod schemas.
 */

import type { Request, Response, NextFunction } from 'express';
import { type ZodType, type ZodError } from 'zod';
import { badRequest } from '../errors.js';

interface ValidationSchemas {
  readonly body?: ZodType;
  readonly query?: ZodType;
  readonly params?: ZodType;
}

function formatZodError(error: ZodError): unknown[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * Middleware factory that validates request parts against Zod schemas.
 * Throws HttpError(400) on validation failure.
 *
 * @example
 * router.post('/', validate({ body: CreateAgentSchema }), handler);
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        throw badRequest('Validation failed', formatZodError(result.error));
      }
      req.body = result.data;
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        throw badRequest('Invalid query parameters', formatZodError(result.error));
      }
      // Attach parsed query to request for typed access
      (req as unknown as { validatedQuery: unknown }).validatedQuery = result.data;
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        throw badRequest('Invalid path parameters', formatZodError(result.error));
      }
    }

    next();
  };
}
