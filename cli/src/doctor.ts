import { execFileSync } from 'node:child_process';
import { existsSync, accessSync, constants } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface CheckResult {
  readonly name: string;
  readonly status: 'pass' | 'warn' | 'fail';
  readonly message: string;
}

function ccoHome(): string {
  return join(homedir(), '.cco');
}

function checkNodeVersion(): CheckResult {
  const version = process.versions.node;
  const major = parseInt(version.split('.')[0], 10);
  if (major >= 20) {
    return { name: 'Node.js', status: 'pass', message: `v${version} (>= 20 required)` };
  }
  return { name: 'Node.js', status: 'fail', message: `v${version} is below minimum (20)` };
}

function checkPnpm(): CheckResult {
  try {
    const stdout = execFileSync('pnpm', ['--version'], { timeout: 5000, encoding: 'utf-8' });
    return { name: 'pnpm', status: 'pass', message: stdout.trim() };
  } catch {
    return { name: 'pnpm', status: 'warn', message: 'Not found — install with: npm i -g pnpm' };
  }
}

function checkClaudeCli(): CheckResult {
  try {
    const stdout = execFileSync('claude', ['--version'], { timeout: 5000, encoding: 'utf-8' });
    return { name: 'Claude CLI', status: 'pass', message: stdout.trim() };
  } catch {
    return { name: 'Claude CLI', status: 'warn', message: 'Not found — install with: npm i -g @anthropic-ai/claude-code' };
  }
}

async function checkServerReachable(): Promise<CheckResult> {
  const url = process.env.CCO_API_URL ?? 'http://localhost:3100/api';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${url}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      return { name: 'Server reachable', status: 'pass', message: `${url}/health returned 200` };
    }
    return { name: 'Server reachable', status: 'warn', message: `Server returned HTTP ${res.status}` };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { name: 'Server reachable', status: 'warn', message: 'Connection timed out' };
    }
    return { name: 'Server reachable', status: 'fail', message: 'Connection refused — is the server running?' };
  }
}

function checkDatabaseExists(): CheckResult {
  const dbPath = join(ccoHome(), 'cco.db');
  if (existsSync(dbPath)) {
    return { name: 'Database', status: 'pass', message: dbPath };
  }
  return { name: 'Database', status: 'warn', message: `${dbPath} not found — run the server to create it` };
}

function checkConfigFile(): CheckResult {
  const configPath = join(ccoHome(), 'config.json');
  if (existsSync(configPath)) {
    return { name: 'Config file', status: 'pass', message: configPath };
  }
  return { name: 'Config file', status: 'pass', message: 'Not found — defaults will be used' };
}

function checkCcoHomeDirectory(): CheckResult {
  const home = ccoHome();
  if (!existsSync(home)) {
    return { name: 'CCO home directory', status: 'fail', message: `${home} does not exist` };
  }
  try {
    accessSync(home, constants.W_OK);
    return { name: 'CCO home directory', status: 'pass', message: home };
  } catch {
    return { name: 'CCO home directory', status: 'fail', message: `${home} is not writable` };
  }
}

function checkApiKey(): CheckResult {
  if (process.env.CCO_API_KEY) {
    return { name: 'API key', status: 'pass', message: 'CCO_API_KEY is set' };
  }
  return { name: 'API key', status: 'warn', message: 'CCO_API_KEY is not set' };
}

function checkSecretsKey(): CheckResult {
  const keyPath = join(ccoHome(), 'secrets', 'master.key');
  if (existsSync(keyPath)) {
    return { name: 'Secrets key', status: 'pass', message: keyPath };
  }
  return { name: 'Secrets key', status: 'pass', message: 'master.key not found — encryption not configured' };
}

export async function runDiagnostics(): Promise<readonly CheckResult[]> {
  const syncChecks: readonly CheckResult[] = [
    checkNodeVersion(),
    checkPnpm(),
    checkClaudeCli(),
  ];

  const serverResult = await checkServerReachable();

  return [
    ...syncChecks,
    serverResult,
    checkDatabaseExists(),
    checkConfigFile(),
    checkCcoHomeDirectory(),
    checkApiKey(),
    checkSecretsKey(),
  ];
}
