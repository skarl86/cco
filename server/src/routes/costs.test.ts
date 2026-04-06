import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp, type App } from '../app.js';
import type { Server } from 'node:http';

function asBody(json: unknown): Record<string, unknown> {
  return json as Record<string, unknown>;
}

describe('Costs API', () => {
  let app: App;
  let server: Server;
  let baseUrl: string;
  let teamId: string;

  beforeAll(async () => {
    app = createApp({ dbPath: ':memory:' });
    await new Promise<void>((resolve) => {
      server = app.express.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Create a team for cost tests
    const res = await fetch(`${baseUrl}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Costs Test Team' }),
    });
    const body = asBody(await res.json());
    teamId = (body.data as Record<string, unknown>).id as string;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    app.close();
  });

  it('GET /api/teams/:teamId/costs returns cost events list', async () => {
    const res = await fetch(`${baseUrl}/api/teams/${teamId}/costs`);
    expect(res.status).toBe(200);
    const body = asBody(await res.json());
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('GET /api/teams/:teamId/costs/monthly returns monthly spend', async () => {
    const res = await fetch(`${baseUrl}/api/teams/${teamId}/costs/monthly`);
    expect(res.status).toBe(200);
    const body = asBody(await res.json());
    expect(body.data).toBeDefined();
  });

  it('GET /api/teams/:teamId/costs/by-agent returns per-agent breakdown', async () => {
    const res = await fetch(`${baseUrl}/api/teams/${teamId}/costs/by-agent`);
    expect(res.status).toBe(200);
    const body = asBody(await res.json());
    expect(body.data).toBeDefined();
  });
});
