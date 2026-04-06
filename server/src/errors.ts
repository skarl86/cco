/**
 * Typed HTTP errors for consistent API error responses.
 * Modeled after Paperclip's error classification system.
 */

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** 400 — Validation errors, malformed input */
export function badRequest(message: string, details?: unknown): HttpError {
  return new HttpError(400, message, details);
}

/** 401 — Missing or invalid authentication credentials */
export function unauthorized(message = 'Unauthorized'): HttpError {
  return new HttpError(401, message);
}

/** 403 — Authenticated but insufficient permissions */
export function forbidden(message = 'Forbidden'): HttpError {
  return new HttpError(403, message);
}

/** 404 — Resource not found */
export function notFound(message = 'Not found'): HttpError {
  return new HttpError(404, message);
}

/** 409 — State conflict (e.g., duplicate, concurrent modification) */
export function conflict(message: string): HttpError {
  return new HttpError(409, message);
}

/** 422 — Semantic validation failed (syntactically valid but logically wrong) */
export function unprocessable(message: string, details?: unknown): HttpError {
  return new HttpError(422, message, details);
}
