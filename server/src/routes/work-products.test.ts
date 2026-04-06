import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp, type App } from '../app.js';
import type { Server } from 'node:http';

function asBody(json: unknown): Record<string, unknown> {
  return json as Record<string, unknown>;
}

describe('Work Products API', () => {
  let app: App;
  let server: Server;
  let baseUrl: string;
  let teamId: string;
  let taskId: string;

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

    // Create a team
    const teamRes = await fetch(`${baseUrl}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'WP Test Team' }),
    });
    const teamBody = asBody(await teamRes.json());
    teamId = (teamBody.data as Record<string, unknown>).id as string;

    // Create a task
    const taskRes = await fetch(`${baseUrl}/api/teams/${teamId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'WP Test Task' }),
    });
    const taskBody = asBody(await taskRes.json());
    taskId = (taskBody.data as Record<string, unknown>).id as string;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    app.close();
  });

  function taskWpUrl(path = '') {
    return `${baseUrl}/api/teams/${teamId}/tasks/${taskId}/work-products${path}`;
  }

  function directWpUrl(id: string) {
    return `${baseUrl}/api/teams/${teamId}/work-products/${id}`;
  }

  it('POST creates work product (201)', async () => {
    const res = await fetch(taskWpUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'pull_request',
        provider: 'github',
        title: 'feat: add auth',
        url: 'https://github.com/org/repo/pull/1',
        isPrimary: true,
      }),
    });
    expect(res.status).toBe(201);
    const body = asBody(await res.json());
    const data = body.data as Record<string, unknown>;
    expect(data.id).toBeDefined();
    expect(data.teamId).toBe(teamId);
    expect(data.taskId).toBe(taskId);
    expect(data.type).toBe('pull_request');
    expect(data.isPrimary).toBe(1);
  });

  it('POST validates required fields (400)', async () => {
    const res = await fetch(taskWpUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'pull_request' }),
    });
    expect(res.status).toBe(400);
  });

  it('GET / lists work products', async () => {
    const res = await fetch(taskWpUrl());
    expect(res.status).toBe(200);
    const body = asBody(await res.json());
    expect((body.data as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it('GET /:id returns single work product', async () => {
    const createRes = await fetch(taskWpUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'branch',
        provider: 'github',
        title: 'feature/auth',
      }),
    });
    const created = (asBody(await createRes.json()).data as Record<string, unknown>);

    const res = await fetch(directWpUrl(created.id as string));
    expect(res.status).toBe(200);
    const body = asBody(await res.json());
    expect((body.data as Record<string, unknown>).title).toBe('feature/auth');
  });

  it('GET /:id returns 404 for non-existent', async () => {
    const res = await fetch(directWpUrl('wp_nonexistent'));
    expect(res.status).toBe(404);
  });

  it('PATCH updates work product', async () => {
    const createRes = await fetch(taskWpUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'pull_request',
        provider: 'github',
        title: 'Original PR',
      }),
    });
    const created = (asBody(await createRes.json()).data as Record<string, unknown>);

    const res = await fetch(directWpUrl(created.id as string), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated PR', status: 'merged' }),
    });
    expect(res.status).toBe(200);
    const body = asBody(await res.json());
    const data = body.data as Record<string, unknown>;
    expect(data.title).toBe('Updated PR');
    expect(data.status).toBe('merged');
  });

  it('DELETE removes work product (204)', async () => {
    const createRes = await fetch(taskWpUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'artifact',
        provider: 'local',
        title: 'To delete',
      }),
    });
    const created = (asBody(await createRes.json()).data as Record<string, unknown>);

    const res = await fetch(directWpUrl(created.id as string), {
      method: 'DELETE',
    });
    expect(res.status).toBe(204);

    // Verify it's gone
    const getRes = await fetch(directWpUrl(created.id as string));
    expect(getRes.status).toBe(404);
  });
});
