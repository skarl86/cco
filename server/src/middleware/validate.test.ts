import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { z } from 'zod';
import { validate } from './validate.js';
import { errorHandler } from './error-handler.js';

const TestBodySchema = z.object({
  name: z.string(),
  age: z.number().optional(),
});

const TestQuerySchema = z.object({
  page: z.coerce.number().int().positive(),
});

describe('validate middleware', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());

    app.post(
      '/body',
      validate({ body: TestBodySchema }),
      (req, res) => {
        res.json({ parsed: req.body });
      },
    );

    app.get(
      '/query',
      validate({ query: TestQuerySchema }),
      (req, res) => {
        const validated = (req as unknown as { validatedQuery: unknown }).validatedQuery;
        res.json({ parsed: validated });
      },
    );

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

  it('passes valid body through with parsed data', async () => {
    const res = await fetch(`${baseUrl}/body`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice', age: 30 }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.parsed).toEqual({ name: 'Alice', age: 30 });
  });

  it('returns 400 with validation details for invalid body', async () => {
    const res = await fetch(`${baseUrl}/body`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 123 }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toBeInstanceOf(Array);
    expect(body.details.length).toBeGreaterThan(0);
  });

  it('returns 400 when required field is missing', async () => {
    const res = await fetch(`${baseUrl}/body`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ age: 25 }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'name' }),
      ]),
    );
  });

  it('passes valid query through', async () => {
    const res = await fetch(`${baseUrl}/query?page=2`);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.parsed).toEqual({ page: 2 });
  });

  it('returns 400 for invalid query parameters', async () => {
    const res = await fetch(`${baseUrl}/query?page=abc`);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid query parameters');
    expect(body.details).toBeInstanceOf(Array);
  });
});
