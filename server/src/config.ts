/**
 * Configuration loader with layered priority:
 * 1. Environment variables (highest)
 * 2. Config file (~/.cco/config.json)
 * 3. Defaults (lowest)
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { CcoConfigSchema, type CcoConfig } from '@cco/shared';

const CCO_HOME = process.env.CCO_HOME ?? path.join(os.homedir(), '.cco');
const CONFIG_PATH = process.env.CCO_CONFIG ?? path.join(CCO_HOME, 'config.json');

/** Read and parse the config file, returning empty object if missing. */
function readConfigFile(configPath: string): Record<string, unknown> {
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function ensureSection(config: Record<string, unknown>, key: string): Record<string, unknown> {
  if (!config[key] || typeof config[key] !== 'object') {
    config[key] = {};
  }
  return config[key] as Record<string, unknown>;
}

/** Apply environment variable overrides on top of file config. */
function applyEnvOverrides(fileConfig: Record<string, unknown>): Record<string, unknown> {
  const config = structuredClone(fileConfig);

  if (process.env.CCO_DB_PATH) {
    ensureSection(config, 'database').path = process.env.CCO_DB_PATH;
  }

  if (process.env.CCO_PORT) {
    ensureSection(config, 'server').port = parseInt(process.env.CCO_PORT, 10);
  }
  if (process.env.HOST) {
    ensureSection(config, 'server').host = process.env.HOST;
  }

  if (process.env.CCO_API_KEY) {
    ensureSection(config, 'auth').apiKey = process.env.CCO_API_KEY;
  }

  if (process.env.CCO_SCHEDULER_INTERVAL_MS) {
    ensureSection(config, 'scheduler').intervalMs =
      parseInt(process.env.CCO_SCHEDULER_INTERVAL_MS, 10);
  }
  if (process.env.CCO_SCHEDULER_ENABLED === 'false') {
    ensureSection(config, 'scheduler').enabled = false;
  }

  if (process.env.LOG_LEVEL) {
    ensureSection(config, 'logging').level = process.env.LOG_LEVEL;
  }

  return config;
}

/** Load config with priority: env > file > defaults */
export function loadConfig(configPath?: string): CcoConfig {
  const filePath = configPath ?? CONFIG_PATH;
  const fileConfig = readConfigFile(filePath);
  const merged = applyEnvOverrides(fileConfig);
  return CcoConfigSchema.parse(merged);
}

/** Write config to file */
export function writeConfig(config: CcoConfig, configPath?: string): void {
  const filePath = configPath ?? CONFIG_PATH;
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const toWrite = {
    ...config,
    $meta: {
      ...(config.$meta ?? {}),
      updatedAt: new Date().toISOString(),
      source: 'cco configure',
    },
  };

  fs.writeFileSync(filePath, JSON.stringify(toWrite, null, 2) + '\n', 'utf-8');
}

/** Resolve the CCO home directory path */
export function getCcoHome(): string {
  return CCO_HOME;
}

/** Resolve the default database path */
export function getDefaultDbPath(): string {
  return process.env.CCO_DB_PATH ?? path.join(CCO_HOME, 'cco.db');
}
