import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { errorHandler } from './error-handler.js';
import { badRequest, notFound, HttpError } from '../errors.js';

describe('errorHandler middleware', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();

    app.get('/bad-request', () => {
      throw badRequest('test error', { field: 'x' });
    });

    app.get('/not-found', () => {
      throw notFound('resource missing');
    });

    app.get('/no-details', () => {
      throw new HttpError(403, 'Forbidden');
    });

    app.get('/crash', () => {
      throw new Error('unexpected internal failure');
    });

    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('returns 400 with error and details for HttpError(400)', async () => {
    const res = await fetch(`${baseUrl}/bad-request`);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'test error',
      details: { field: 'x' },
    });
  });

  it('returns 404 with error for HttpError(404)', async () => {
    const res = await fetch(`${baseUrl}/not-found`);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'resource missing' });
  });

  it('omits details field when HttpError has no details', async () => {
    const res = await fetch(`${baseUrl}/no-details`);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ error: 'Forbidden' });
    expect(body).not.toHaveProperty('details');
  });

  it('returns 500 with generic message for non-HttpError', async () => {
    const res = await fetch(`${baseUrl}/crash`);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });

  it('does not leak stack trace or internal message for unexpected errors', async () => {
    const res = await fetch(`${baseUrl}/crash`);
    const text = await res.text();

    expect(text).not.toContain('unexpected internal failure');
    expect(text).not.toContain('at ');
  });
});
