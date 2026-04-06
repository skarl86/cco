import { describe, it, expect } from 'vitest';
import { CcoConfigSchema, parseConfig } from './config-schema.js';

describe('CcoConfigSchema', () => {
  it('parses empty object with defaults for all optional sections', () => {
    const result = CcoConfigSchema.parse({});

    expect(result).toEqual({});
  });

  it('overrides server.port while keeping other defaults', () => {
    const result = CcoConfigSchema.parse({ server: { port: 4000 } });

    expect(result.server?.port).toBe(4000);
    expect(result.server?.host).toBe('127.0.0.1');
    expect(result.server?.serveUi).toBe(true);
  });

  it('rejects negative port', () => {
    expect(() => CcoConfigSchema.parse({ server: { port: -1 } })).toThrow();
  });

  it('rejects port above 65535', () => {
    expect(() => CcoConfigSchema.parse({ server: { port: 70000 } })).toThrow();
  });

  it('accepts valid logging level "debug"', () => {
    const result = CcoConfigSchema.parse({ logging: { level: 'debug' } });

    expect(result.logging?.level).toBe('debug');
  });

  it('rejects invalid logging level', () => {
    expect(() =>
      CcoConfigSchema.parse({ logging: { level: 'invalid' } }),
    ).toThrow();
  });

  it('accepts database mode "sqlite"', () => {
    const result = CcoConfigSchema.parse({ database: { mode: 'sqlite' } });

    expect(result.database?.mode).toBe('sqlite');
  });

  it('full config with all sections parses correctly', () => {
    const full = {
      $meta: { version: '2', updatedAt: '2026-01-01T00:00:00Z', source: 'test' },
      database: {
        mode: 'sqlite' as const,
        path: '/tmp/test.db',
        backup: { enabled: true, intervalMinutes: 30, retentionDays: 7, dir: '/tmp/backups' },
      },
      server: { host: '0.0.0.0', port: 8080, serveUi: false },
      scheduler: { enabled: false, intervalMs: 30000 },
      auth: { apiKey: 'test-key' },
      logging: { level: 'warn' as const },
      telemetry: { enabled: false },
    };

    const result = CcoConfigSchema.parse(full);

    expect(result.server?.port).toBe(8080);
    expect(result.server?.host).toBe('0.0.0.0');
    expect(result.database?.mode).toBe('sqlite');
    expect(result.database?.backup?.enabled).toBe(true);
    expect(result.scheduler?.enabled).toBe(false);
    expect(result.auth?.apiKey).toBe('test-key');
    expect(result.logging?.level).toBe('warn');
    expect(result.telemetry?.enabled).toBe(false);
    expect(result.$meta?.version).toBe('2');
  });
});

describe('parseConfig', () => {
  it('works the same as CcoConfigSchema.parse', () => {
    const input = { server: { port: 5000 } };

    const fromSchema = CcoConfigSchema.parse(input);
    const fromHelper = parseConfig(input);

    expect(fromHelper).toEqual(fromSchema);
  });
});
