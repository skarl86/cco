import { spawn } from 'node:child_process';
import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
} from '@cco/adapter-utils';

export function buildCodexArgs(opts: {
  readonly model?: string;
  readonly approval?: 'suggest' | 'auto-edit' | 'full-auto';
}): string[] {
  const args: string[] = ['--quiet'];

  if (opts.model) {
    args.push('--model', opts.model);
  }
  if (opts.approval) {
    args.push(`--approval-mode`, opts.approval);
  }

  return args;
}

export async function executeCodex(
  ctx: AdapterExecutionContext,
): Promise<AdapterExecutionResult> {
  const config = ctx.agent.adapterConfig;
  const ALLOWED_APPROVAL_MODES = new Set(['suggest', 'auto-edit', 'full-auto']);
  const rawApproval = config.approval as string | undefined;
  const approval = rawApproval && ALLOWED_APPROVAL_MODES.has(rawApproval)
    ? (rawApproval as 'suggest' | 'auto-edit' | 'full-auto')
    : undefined;
  const args = buildCodexArgs({
    model: config.model as string | undefined,
    approval,
  });

  const prompt = (ctx.context.prompt as string) ?? '';
  const cwd = ctx.workingDirectory ?? process.cwd();
  const timeoutMs = (config.timeoutMs as number) ?? 300_000;

  // C-4: Command allowlist — prevent arbitrary binary execution
  const ALLOWED_COMMANDS = new Set(['codex']);
  const rawCommand = (config.command as string) ?? 'codex';
  if (!ALLOWED_COMMANDS.has(rawCommand)) {
    return Promise.resolve({
      exitCode: null,
      signal: null,
      timedOut: false,
      errorMessage: `Disallowed command: ${rawCommand}. Allowed: ${[...ALLOWED_COMMANDS].join(', ')}`,
    });
  }

  // C-5: Block dangerous environment variable overrides
  const BLOCKED_ENV_KEYS = new Set(['PATH', 'LD_PRELOAD', 'LD_LIBRARY_PATH', 'DYLD_INSERT_LIBRARIES', 'HOME', 'SHELL']);
  const userEnv = (config.env as Record<string, string> | undefined) ?? {};
  const safeEnv: Record<string, string> = {};
  for (const [key, val] of Object.entries(userEnv)) {
    if (!BLOCKED_ENV_KEYS.has(key)) {
      safeEnv[key] = val;
    }
  }

  return new Promise<AdapterExecutionResult>((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const proc = spawn(rawCommand, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...safeEnv },
    });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
      setTimeout(() => proc.kill('SIGKILL'), 5000);
    }, timeoutMs);

    if (ctx.onSpawn) {
      ctx.onSpawn({ pid: proc.pid ?? 0, startedAt: new Date().toISOString() });
    }

    proc.stdin.write(prompt);
    proc.stdin.end();

    proc.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      ctx.onLog('stdout', text);
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      ctx.onLog('stderr', text);
    });

    proc.on('close', (code, signal) => {
      clearTimeout(timer);

      resolve({
        exitCode: code,
        signal: signal ?? null,
        timedOut,
        errorMessage: code !== 0 ? stderr.slice(0, 2000) || null : null,
        provider: 'openai',
        model: (config.model as string) ?? null,
        billingType: 'api',
        summary: stdout.trim() || null,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        exitCode: null,
        signal: null,
        timedOut: false,
        errorMessage: err.message,
      });
    });
  });
}
