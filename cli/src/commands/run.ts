import type { Command } from 'commander';
import { client } from '../client.js';
import { json, table, ok, handleError } from '../format.js';

interface Run {
  readonly id: string;
  readonly agentId: string;
  readonly status: string;
  readonly createdAt: string;
}

interface SingleResponse {
  readonly data: Run;
}

interface ListResponse {
  readonly data: readonly Run[];
}

export function registerRunCommands(program: Command): void {
  const run = program.command('run').description('Execute and list agent runs');

  run
    .command('exec')
    .description('Execute an agent run')
    .argument('<agentId>', 'Agent ID')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .requiredOption('--prompt <text>', 'Prompt text')
    .option('--task <taskId>', 'Associated task ID')
    .option('--json', 'Output raw JSON')
    .action(
      async (
        agentId: string,
        opts: { team: string; prompt: string; task?: string; json?: boolean },
      ) => {
        try {
          const body: Record<string, string> = { prompt: opts.prompt };
          if (opts.task) body.taskId = opts.task;

          const res = await client.post<SingleResponse>(
            `/teams/${opts.team}/agents/${agentId}/run`,
            body,
          );
          if (opts.json) {
            json(res);
            return;
          }
          ok(`Started run ${res.data.id} (status: ${res.data.status})`);
        } catch (err) {
          handleError(err);
        }
      },
    );

  run
    .command('list')
    .description('List runs in a team')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { team: string; json?: boolean }) => {
      try {
        const res = await client.get<ListResponse>(`/teams/${opts.team}/runs`);
        if (opts.json) {
          json(res);
          return;
        }
        table(
          res.data.map((r) => ({
            id: r.id,
            agent: r.agentId,
            status: r.status,
            createdAt: r.createdAt,
          })),
          ['id', 'agent', 'status', 'createdAt'],
        );
      } catch (err) {
        handleError(err);
      }
    });
}
