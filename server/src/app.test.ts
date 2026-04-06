import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp, type App } from './app.js';
import { claudeCodeAdapter } from '@cco/adapter-claude-code';
import type { Server } from 'node:http';

function asBody(json: unknown): Record<string, unknown> {
  return json as Record<string, unknown>;
}

describe('Express app', () => {
  let app: App;

  beforeAll(() => {
    app = createApp({ dbPath: ':memory:' });
  });

  afterAll(() => {
    app.close();
  });

  it('creates app with express and database', () => {
    expect(app).toBeDefined();
    expect(app.express).toBeDefined();
    expect(app.database).toBeDefined();
  });

  it('creates app with scheduler', () => {
    expect(app.scheduler).toBeDefined();
    expect(typeof app.scheduler.tick).toBe('function');
    expect(typeof app.scheduler.start).toBe('function');
    expect(typeof app.scheduler.stop).toBe('function');
  });
});

describe('Adapter registration', () => {
  let app: App;

  afterAll(() => {
    app?.close();
  });

  it('registers claude_code adapter when passed via config', () => {
    app = createApp({ dbPath: ':memory:', adapters: [claudeCodeAdapter] });
    expect(app.registry.has('claude_code')).toBe(true);
  });
});

describe('Health endpoint integration', () => {
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
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    app.close();
  });

  it('GET /api/health returns 200', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = asBody(await res.json());
    expect(body.status).toBe('ok');
    expect(body.version).toBeDefined();
  });

  it('GET /api/health returns database status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const body = asBody(await res.json());
    expect(body.database).toBe('connected');
  });

  it('GET /api/unknown returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/unknown`);
    expect(res.status).toBe(404);
  });
});
