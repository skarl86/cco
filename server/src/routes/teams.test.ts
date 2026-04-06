import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp, type App } from '../app.js';
import type { Server } from 'node:http';

describe('Teams API', () => {
  let app: App;
  let server: Server;
  let baseUrl: string;

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
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    app.close();
  });

  it('POST /api/teams creates a team', async () => {
    const res = await fetch(`${baseUrl}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Team', description: 'A test' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('Test Team');
    expect(body.data.id).toBeDefined();
    expect(body.data.status).toBe('active');
  });

  it('POST /api/teams rejects empty name', async () => {
    const res = await fetch(`${baseUrl}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /api/teams lists teams', async () => {
    const res = await fetch(`${baseUrl}/api/teams`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/teams/:id returns a team', async () => {
    // Create a team first
    const createRes = await fetch(`${baseUrl}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Get Team' }),
    });
    const { data: created } = await createRes.json();

    const res = await fetch(`${baseUrl}/api/teams/${created.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('Get Team');
  });

  it('GET /api/teams/:id returns 404 for missing team', async () => {
    const res = await fetch(`${baseUrl}/api/teams/nonexistent`);
    expect(res.status).toBe(404);
  });

  it('PATCH /api/teams/:id updates a team', async () => {
    const createRes = await fetch(`${baseUrl}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Original' }),
    });
    const { data: created } = await createRes.json();

    const res = await fetch(`${baseUrl}/api/teams/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('Updated');
  });
});
