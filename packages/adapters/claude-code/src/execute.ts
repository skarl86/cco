import { spawn } from 'node:child_process';
import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
} from '@cco/adapter-utils';
import { parseClaudeStreamJson } from './parse.js';

export const DEFAULT_ALLOWED_TOOLS: readonly string[] = [
  'Bash(command:*)',
  'Write',
  'Edit',
  'Read',
  'Glob',
  'Grep',
];

export interface BuildArgsOptions {
  readonly sessionId?: string;
  readonly model?: string;
  readonly maxTurns?: number;
  readonly allowUnsafe?: boolean;
  readonly allowedTools?: string[];
  readonly skillsDir?: string;
  readonly systemPromptFile?: string;
  readonly effort?: string;
}

export function buildClaudeArgs(opts: BuildArgsOptions): string[] {
  const args: string[] = ['--print', '-', '--output-format', 'stream-json', '--verbose'];

  if (opts.sessionId) {
    args.push('--resume', opts.sessionId);
  }
  if (opts.model) {
    args.push('--model', opts.model);
  }
  if (opts.maxTurns) {
    args.push('--max-turns', String(opts.maxTurns));
  }
  if (opts.allowUnsafe) {
    args.push('--dangerously-skip-permissions');
  } else {
    const tools = opts.allowedTools?.length ? opts.allowedTools : DEFAULT_ALLOWED_TOOLS;
    for (const tool of tools) {
      args.push('--allowedTools', tool);
    }
  }
  if (opts.skillsDir) {
    args.push('--add-dir', opts.skillsDir);
  }
  if (opts.systemPromptFile) {
    args.push('--append-system-prompt-file', opts.systemPromptFile);
  }
  if (opts.effort) {
    args.push('--effort', opts.effort);
  }

  return args;
}

export async function executeClaudeCode(
  ctx: AdapterExecutionContext,
): Promise<AdapterExecutionResult> {
  const config = ctx.agent.adapterConfig;
  const args = buildClaudeArgs({
    sessionId: ctx.runtime.sessionId ?? undefined,
    model: config.model as string | undefined,
    maxTurns: config.maxTurns as number | undefined,
    allowUnsafe: (config.allowUnsafe as boolean) ?? false,
    allowedTools: Array.isArray(config.allowedTools) ? config.allowedTools as string[] : undefined,
    skillsDir: config.skillsDir as string | undefined,
    systemPromptFile: config.systemPromptFile as string | undefined,
    effort: config.effort as string | undefined,
  });

  const prompt = ctx.context.prompt as string ?? '';
  const cwd = ctx.workingDirectory ?? process.cwd();
  const timeoutMs = (config.timeoutMs as number) ?? 300_000;

  // C-4: Command allowlist — prevent arbitrary binary execution
  const ALLOWED_COMMANDS = new Set(['claude']);
  const rawCommand = (config.command as string) ?? 'claude';
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

      const parsed = parseClaudeStreamJson(stdout);

      resolve({
        exitCode: code,
        signal: signal ?? null,
        timedOut,
        errorMessage: code !== 0 ? stderr.slice(0, 2000) || null : null,
        usage: parsed.usage ?? undefined,
        sessionId: parsed.sessionId,
        provider: 'anthropic',
        model: parsed.model,
        billingType: 'api',
        costUsd: parsed.costUsd,
        summary: parsed.summary,
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
