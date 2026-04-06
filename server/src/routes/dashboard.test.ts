import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp, type App } from '../app.js';
import type { Server } from 'node:http';

function asBody(json: unknown): Record<string, unknown> {
  return json as Record<string, unknown>;
}

describe('Dashboard API', () => {
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

    // Create a team for dashboard tests
    const res = await fetch(`${baseUrl}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dashboard Test Team' }),
    });
    const body = asBody(await res.json());
    teamId = (body.data as Record<string, unknown>).id as string;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    app.close();
  });

  it('GET /api/teams/:teamId/dashboard returns dashboard metrics', async () => {
    const res = await fetch(`${baseUrl}/api/teams/${teamId}/dashboard`);
    expect(res.status).toBe(200);
    const body = asBody(await res.json());
    const data = body.data as Record<string, unknown>;
    expect(data).toBeDefined();
  });

  it('dashboard contains expected keys', async () => {
    const res = await fetch(`${baseUrl}/api/teams/${teamId}/dashboard`);
    expect(res.status).toBe(200);
    const body = asBody(await res.json());
    const data = body.data as Record<string, unknown>;

    const expectedKeys = ['agents', 'tasks', 'runs', 'costs', 'projects', 'routines', 'approvals'];
    for (const key of expectedKeys) {
      expect(data).toHaveProperty(key);
    }
  });
});
