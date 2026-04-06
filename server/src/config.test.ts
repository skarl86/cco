import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('server config loader', () => {
  let tmpDir: string;
  const savedEnv: Record<string, string | undefined> = {};
  const envKeys = [
    'CCO_HOME',
    'CCO_CONFIG',
    'CCO_PORT',
    'CCO_DB_PATH',
    'HOST',
    'CCO_API_KEY',
    'CCO_SCHEDULER_INTERVAL_MS',
    'CCO_SCHEDULER_ENABLED',
    'LOG_LEVEL',
  ];

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cco-config-test-'));
    vi.resetModules();

    for (const key of envKeys) {
      savedEnv[key] = process.env[key];
    }

    process.env.CCO_HOME = tmpDir;
    process.env.CCO_CONFIG = path.join(tmpDir, 'config.json');

    delete process.env.CCO_PORT;
    delete process.env.CCO_DB_PATH;
    delete process.env.HOST;
    delete process.env.CCO_API_KEY;
    delete process.env.CCO_SCHEDULER_INTERVAL_MS;
    delete process.env.CCO_SCHEDULER_ENABLED;
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  async function loadModule() {
    return await import('./config.js') as typeof import('./config.js');
  }

  it('loadConfig returns valid defaults when no config file exists', async () => {
    const { loadConfig } = await loadModule();
    const configPath = path.join(tmpDir, 'nonexistent.json');

    const config = loadConfig(configPath);

    expect(config).toBeDefined();
    expect(config.server).toBeUndefined();
    expect(config.database).toBeUndefined();
  });

  it('loadConfig respects CCO_PORT env var override', async () => {
    process.env.CCO_PORT = '9999';
    const { loadConfig } = await loadModule();
    const configPath = path.join(tmpDir, 'nonexistent.json');

    const config = loadConfig(configPath);

    expect(config.server?.port).toBe(9999);
  });

  it('writeConfig creates file and loadConfig reads it back', async () => {
    const { writeConfig, loadConfig } = await loadModule();
    const configPath = path.join(tmpDir, 'written-config.json');

    const original = {
      server: { host: '0.0.0.0' as const, port: 7777, serveUi: false },
      logging: { level: 'debug' as const },
    };

    writeConfig(original, configPath);

    expect(fs.existsSync(configPath)).toBe(true);

    const loaded = loadConfig(configPath);

    expect(loaded.server?.port).toBe(7777);
    expect(loaded.server?.host).toBe('0.0.0.0');
    expect(loaded.logging?.level).toBe('debug');
  });

  it('getDefaultDbPath returns expected path', async () => {
    const { getDefaultDbPath, getCcoHome } = await loadModule();

    const dbPath = getDefaultDbPath();
    const home = getCcoHome();

    expect(dbPath).toBe(path.join(home, 'cco.db'));
  });

  it('getCcoHome returns CCO_HOME env value', async () => {
    const { getCcoHome } = await loadModule();

    expect(getCcoHome()).toBe(tmpDir);
  });
});
