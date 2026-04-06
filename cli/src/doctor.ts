import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface DiagnosticResult {
  readonly name: string;
  readonly status: 'ok' | 'warn' | 'error';
  readonly message: string;
}

async function checkNodeVersion(): Promise<DiagnosticResult> {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);
  if (major >= 20) {
    return { name: 'Node.js', status: 'ok', message: `${version} (>= 20 required)` };
  }
  return { name: 'Node.js', status: 'error', message: `${version} is below minimum (20)` };
}

async function checkClaudeCli(): Promise<DiagnosticResult> {
  try {
    const { stdout } = await execFileAsync('claude', ['--version'], { timeout: 5000 });
    return { name: 'Claude CLI', status: 'ok', message: stdout.trim() };
  } catch {
    return { name: 'Claude CLI', status: 'warn', message: 'Not found — install with: npm i -g @anthropic-ai/claude-code' };
  }
}

async function checkPnpm(): Promise<DiagnosticResult> {
  try {
    const { stdout } = await execFileAsync('pnpm', ['--version'], { timeout: 5000 });
    return { name: 'pnpm', status: 'ok', message: stdout.trim() };
  } catch {
    return { name: 'pnpm', status: 'warn', message: 'Not found — install with: npm i -g pnpm' };
  }
}

export async function runDiagnostics(): Promise<readonly DiagnosticResult[]> {
  const checks = await Promise.all([
    checkNodeVersion(),
    checkClaudeCli(),
    checkPnpm(),
  ]);
  return checks;
}
