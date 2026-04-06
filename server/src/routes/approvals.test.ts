import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp, type App } from '../app.js';
import type { Server } from 'node:http';

function asBody(json: unknown): Record<string, unknown> {
  return json as Record<string, unknown>;
}

describe('Approvals API', () => {
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

    // Create a team for approval tests
    const res = await fetch(`${baseUrl}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Approvals Test Team' }),
    });
    const body = asBody(await res.json());
    teamId = (body.data as Record<string, unknown>).id as string;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    app.close();
  });

  it('POST /api/teams/:teamId/approvals creates an approval', async () => {
    const res = await fetch(`${baseUrl}/api/teams/${teamId}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'deploy',
        payload: { environment: 'production' },
      }),
    });
    expect(res.status).toBe(201);
    const body = asBody(await res.json());
    const data = body.data as Record<string, unknown>;
    expect(data.id).toBeDefined();
    expect(data.type).toBe('deploy');
    expect(data.status).toBe('pending');
    expect(data.teamId).toBe(teamId);
  });

  it('GET /api/teams/:teamId/approvals lists approvals', async () => {
    const res = await fetch(`${baseUrl}/api/teams/${teamId}/approvals`);
    expect(res.status).toBe(200);
    const body = asBody(await res.json());
    expect((body.data as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/teams/:teamId/approvals?status=pending filters pending', async () => {
    const res = await fetch(`${baseUrl}/api/teams/${teamId}/approvals?status=pending`);
    expect(res.status).toBe(200);
    const body = asBody(await res.json());
    const data = body.data as Record<string, unknown>[];
    expect(data.length).toBeGreaterThanOrEqual(1);
    for (const approval of data) {
      expect(approval.status).toBe('pending');
    }
  });

  it('POST /api/teams/:teamId/approvals/:id/decide approves an approval', async () => {
    // Create a fresh approval to decide on
    const createRes = await fetch(`${baseUrl}/api/teams/${teamId}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'release',
        payload: { version: '2.0.0' },
      }),
    });
    const created = (asBody(await createRes.json()).data as Record<string, unknown>);

    const res = await fetch(`${baseUrl}/api/teams/${teamId}/approvals/${created.id}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approved', note: 'Looks good' }),
    });
    expect(res.status).toBe(200);
    const body = asBody(await res.json());
    const data = body.data as Record<string, unknown>;
    expect(data.status).toBe('approved');
  });

  it('POST /api/teams/:teamId/approvals/:id/decide rejects an approval', async () => {
    const createRes = await fetch(`${baseUrl}/api/teams/${teamId}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'access',
        payload: { resource: 'admin-panel' },
      }),
    });
    const created = (asBody(await createRes.json()).data as Record<string, unknown>);

    const res = await fetch(`${baseUrl}/api/teams/${teamId}/approvals/${created.id}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'rejected', note: 'Not ready' }),
    });
    expect(res.status).toBe(200);
    const body = asBody(await res.json());
    const data = body.data as Record<string, unknown>;
    expect(data.status).toBe('rejected');
  });
});
