import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp, type App } from '../app.js';
import type { Server } from 'node:http';

function asBody(json: unknown): Record<string, unknown> {
  return json as Record<string, unknown>;
}

describe('Feedback API', () => {
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

    // Create a team for feedback tests
    const res = await fetch(`${baseUrl}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Feedback Test Team' }),
    });
    const body = asBody(await res.json());
    teamId = (body.data as Record<string, unknown>).id as string;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    app.close();
  });

  it('POST /api/teams/:teamId/feedback creates feedback', async () => {
    const res = await fetch(`${baseUrl}/api/teams/${teamId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetType: 'task',
        targetId: 'task-abc',
        vote: 'up',
        reason: 'Well done',
      }),
    });
    expect(res.status).toBe(201);
    const body = asBody(await res.json());
    const data = body.data as Record<string, unknown>;
    expect(data.id).toBeDefined();
    expect(data.vote).toBe('up');
    expect(data.targetType).toBe('task');
    expect(data.targetId).toBe('task-abc');
  });

  it('GET /api/teams/:teamId/feedback lists feedback', async () => {
    const res = await fetch(`${baseUrl}/api/teams/${teamId}/feedback`);
    expect(res.status).toBe(200);
    const body = asBody(await res.json());
    expect((body.data as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/teams/:teamId/feedback/summary returns vote counts', async () => {
    // Create additional feedback to have meaningful counts
    await fetch(`${baseUrl}/api/teams/${teamId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetType: 'task',
        targetId: 'task-xyz',
        vote: 'up',
      }),
    });
    await fetch(`${baseUrl}/api/teams/${teamId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetType: 'task',
        targetId: 'task-xyz',
        vote: 'down',
      }),
    });

    const res = await fetch(
      `${baseUrl}/api/teams/${teamId}/feedback/summary?targetType=task&targetId=task-xyz`,
    );
    expect(res.status).toBe(200);
    const body = asBody(await res.json());
    const data = body.data as Record<string, unknown>;
    expect(data).toBeDefined();
  });
});
