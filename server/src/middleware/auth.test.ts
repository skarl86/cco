import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp, type App } from '../app.js';
import type { Server } from 'node:http';

describe('API Key Auth (when enabled)', () => {
  let app: App;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    // Create app with auth enabled
    app = createApp({ dbPath: ':memory:', apiKey: 'test-secret-key' });
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

  it('rejects requests without API key', async () => {
    const res = await fetch(`${baseUrl}/api/teams`);
    expect(res.status).toBe(401);
  });

  it('rejects requests with wrong API key', async () => {
    const res = await fetch(`${baseUrl}/api/teams`, {
      headers: { Authorization: 'Bearer wrong-key' },
    });
    expect(res.status).toBe(401);
  });

  it('accepts requests with correct API key', async () => {
    const res = await fetch(`${baseUrl}/api/teams`, {
      headers: { Authorization: 'Bearer test-secret-key' },
    });
    expect(res.status).toBe(200);
  });

  it('allows health check without auth', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
  });
});
