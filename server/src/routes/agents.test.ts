import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp, type App } from '../app.js';
import type { Server } from 'node:http';

describe('Agents API', () => {
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

    // Create a team for agent tests
    const res = await fetch(`${baseUrl}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Agent Test Team' }),
    });
    const body = await res.json();
    teamId = body.data.id;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    app.close();
  });

  it('POST /api/teams/:teamId/agents creates an agent', async () => {
    const res = await fetch(`${baseUrl}/api/teams/${teamId}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Architect Bot',
        role: 'architect',
        title: 'Lead Architect',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('Architect Bot');
    expect(body.data.role).toBe('architect');
    expect(body.data.teamId).toBe(teamId);
    expect(body.data.adapterType).toBe('claude_code');
  });

  it('POST /api/teams/:teamId/agents rejects empty name', async () => {
    const res = await fetch(`${baseUrl}/api/teams/${teamId}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /api/teams/:teamId/agents lists agents', async () => {
    const res = await fetch(`${baseUrl}/api/teams/${teamId}/agents`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/teams/:teamId/agents/:id returns an agent', async () => {
    const createRes = await fetch(`${baseUrl}/api/teams/${teamId}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Getter Bot' }),
    });
    const { data: created } = await createRes.json();

    const res = await fetch(`${baseUrl}/api/teams/${teamId}/agents/${created.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('Getter Bot');
  });

  it('PATCH /api/teams/:teamId/agents/:id updates an agent', async () => {
    const createRes = await fetch(`${baseUrl}/api/teams/${teamId}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Original Bot' }),
    });
    const { data: created } = await createRes.json();

    const res = await fetch(`${baseUrl}/api/teams/${teamId}/agents/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Bot', role: 'reviewer' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('Updated Bot');
    expect(body.data.role).toBe('reviewer');
  });

  it('DELETE /api/teams/:teamId/agents/:id deletes an agent', async () => {
    const createRes = await fetch(`${baseUrl}/api/teams/${teamId}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Delete Me' }),
    });
    const { data: created } = await createRes.json();

    const res = await fetch(`${baseUrl}/api/teams/${teamId}/agents/${created.id}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(204);

    const getRes = await fetch(`${baseUrl}/api/teams/${teamId}/agents/${created.id}`);
    expect(getRes.status).toBe(404);
  });
});
