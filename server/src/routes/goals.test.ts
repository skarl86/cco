import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp, type App } from '../app.js';
import type { Server } from 'node:http';

function asBody(json: unknown): Record<string, unknown> {
  return json as Record<string, unknown>;
}

describe('Goals API', () => {
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

    // Create a team for goal tests
    const res = await fetch(`${baseUrl}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Goals Test Team' }),
    });
    const body = asBody(await res.json());
    teamId = (body.data as Record<string, unknown>).id as string;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    app.close();
  });

  it('POST /api/teams/:teamId/goals creates a goal', async () => {
    const res = await fetch(`${baseUrl}/api/teams/${teamId}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Ship v1', description: 'Launch the first version' }),
    });
    expect(res.status).toBe(201);
    const body = asBody(await res.json());
    const data = body.data as Record<string, unknown>;
    expect(data.title).toBe('Ship v1');
    expect(data.description).toBe('Launch the first version');
    expect(data.id).toBeDefined();
    expect(data.teamId).toBe(teamId);
  });

  it('GET /api/teams/:teamId/goals lists goals', async () => {
    const res = await fetch(`${baseUrl}/api/teams/${teamId}/goals`);
    expect(res.status).toBe(200);
    const body = asBody(await res.json());
    expect((body.data as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/teams/:teamId/goals/:id returns a single goal', async () => {
    const createRes = await fetch(`${baseUrl}/api/teams/${teamId}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Get Me Goal' }),
    });
    const created = (asBody(await createRes.json()).data as Record<string, unknown>);

    const res = await fetch(`${baseUrl}/api/teams/${teamId}/goals/${created.id}`);
    expect(res.status).toBe(200);
    const body = asBody(await res.json());
    expect((body.data as Record<string, unknown>).title).toBe('Get Me Goal');
  });

  it('GET /api/teams/:teamId/goals/:id returns 404 for non-existent', async () => {
    const res = await fetch(`${baseUrl}/api/teams/${teamId}/goals/nonexistent`);
    expect(res.status).toBe(404);
  });

  it('PATCH /api/teams/:teamId/goals/:id updates a goal', async () => {
    const createRes = await fetch(`${baseUrl}/api/teams/${teamId}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Original Goal' }),
    });
    const created = (asBody(await createRes.json()).data as Record<string, unknown>);

    const res = await fetch(`${baseUrl}/api/teams/${teamId}/goals/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Goal', priority: 'high' }),
    });
    expect(res.status).toBe(200);
    const body = asBody(await res.json());
    const data = body.data as Record<string, unknown>;
    expect(data.title).toBe('Updated Goal');
    expect(data.priority).toBe('high');
  });

  it('GET /api/teams/:teamId/goals/:id/children lists children', async () => {
    // Create a parent goal
    const parentRes = await fetch(`${baseUrl}/api/teams/${teamId}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Parent Goal' }),
    });
    const parent = (asBody(await parentRes.json()).data as Record<string, unknown>);

    // Create a child goal
    await fetch(`${baseUrl}/api/teams/${teamId}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Child Goal', parentId: parent.id }),
    });

    const res = await fetch(`${baseUrl}/api/teams/${teamId}/goals/${parent.id}/children`);
    expect(res.status).toBe(200);
    const body = asBody(await res.json());
    const children = body.data as unknown[];
    expect(children.length).toBeGreaterThanOrEqual(1);
    expect((children[0] as Record<string, unknown>).title).toBe('Child Goal');
  });
});
