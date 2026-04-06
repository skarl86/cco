import type { Command } from 'commander';
import * as p from '@clack/prompts';
import { client } from '../client.js';
import { json, ok, fail, handleError } from '../format.js';

interface Run {
  readonly id: string;
  readonly agentId: string;
  readonly status: string;
  readonly error?: string;
  readonly tokensUsed?: number;
  readonly costUsd?: number;
  readonly createdAt: string;
  readonly completedAt?: string;
}

interface SingleResponse {
  readonly data: Run;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDuration(startIso: string, endIso?: string): string {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const seconds = Math.round((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

export function registerHeartbeatCommands(program: Command): void {
  const heartbeat = program.command('heartbeat').description('Agent heartbeat operations');

  heartbeat
    .command('run')
    .description('Trigger an agent run and stream status')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .requiredOption('-a, --agent <agentId>', 'Agent ID')
    .option('--prompt <text>', 'Prompt text', 'heartbeat check')
    .option('--timeout <ms>', 'Timeout in milliseconds', '120000')
    .option('--json', 'Output raw JSON')
    .action(
      async (opts: {
        team: string;
        agent: string;
        prompt: string;
        timeout: string;
        json?: boolean;
      }) => {
        try {
          const startRes = await client.post<SingleResponse>(
            `/teams/${opts.team}/agents/${opts.agent}/run`,
            { prompt: opts.prompt },
          );

          const runId = startRes.data.id;
          const timeoutMs = parseInt(opts.timeout, 10);

          if (opts.json) {
            const result = await pollUntilDone(runId, timeoutMs);
            json(result);
            return;
          }

          const spinner = p.spinner();
          spinner.start(`Run ${runId} is running...`);

          const result = await pollUntilDone(runId, timeoutMs);

          if (result.data.status === 'completed') {
            spinner.stop(`Run ${runId} completed`);
            ok(`Status: completed`);
            const duration = formatDuration(result.data.createdAt, result.data.completedAt);
            ok(`Duration: ${duration}`);
            if (result.data.tokensUsed != null) {
              ok(`Tokens: ${result.data.tokensUsed}`);
            }
            if (result.data.costUsd != null) {
              ok(`Cost: $${result.data.costUsd.toFixed(4)}`);
            }
          } else if (result.data.status === 'failed') {
            spinner.stop(`Run ${runId} failed`);
            fail(`Error: ${result.data.error ?? 'Unknown error'}`);
            process.exitCode = 1;
          } else {
            spinner.stop(`Run ${runId} ended with status: ${result.data.status}`);
          }
        } catch (err) {
          handleError(err);
        }
      },
    );
}

async function pollUntilDone(runId: string, timeoutMs: number): Promise<SingleResponse> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await client.get<SingleResponse>(`/runs/${runId}`);
    if (res.data.status !== 'running') {
      return res;
    }
    await sleep(2000);
  }

  throw new Error(`Run ${runId} timed out after ${timeoutMs}ms`);
}
