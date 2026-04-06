import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp, type App } from '../app.js';
import type { Server } from 'node:http';

describe('Runs API', () => {
  let app: App;
  let server: Server;
  let baseUrl: string;
  let teamId: string;
  let agentId: string;

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

    // Create team
    const teamRes = await fetch(`${baseUrl}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Run Test Team' }),
    });
    teamId = (await teamRes.json()).data.id;

    // Create agent with mock adapter
    const agentRes = await fetch(`${baseUrl}/api/teams/${teamId}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Run Agent', adapterType: 'mock' }),
    });
    agentId = (await agentRes.json()).data.id;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    app.close();
  });

  it('POST /api/teams/:teamId/agents/:agentId/run starts a run', async () => {
    const res = await fetch(`${baseUrl}/api/teams/${teamId}/agents/${agentId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Hello test!' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.runId).toBeDefined();
    expect(body.data.status).toBe('completed');
  });

  it('GET /api/teams/:teamId/runs lists runs', async () => {
    const res = await fetch(`${baseUrl}/api/teams/${teamId}/runs`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/runs/:id returns a run', async () => {
    // Start a run first
    const runRes = await fetch(`${baseUrl}/api/teams/${teamId}/agents/${agentId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'For get test' }),
    });
    const { data: runData } = await runRes.json();

    const res = await fetch(`${baseUrl}/api/runs/${runData.runId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(runData.runId);
  });

  it('GET /api/runs/nonexistent returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/runs/nonexistent`);
    expect(res.status).toBe(404);
  });
});
