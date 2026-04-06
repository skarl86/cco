import type { Command } from 'commander';
import { client } from '../client.js';
import { json, table, handleError } from '../format.js';

interface Agent {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly status: string;
}

interface ListResponse {
  readonly data: readonly Agent[];
}

interface SingleResponse {
  readonly data: Agent;
}

export function registerAgentCommands(program: Command): void {
  const agent = program.command('agent').description('Manage agents');

  agent
    .command('list')
    .description('List agents in a team')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { team: string; json?: boolean }) => {
      try {
        const res = await client.get<ListResponse>(`/teams/${opts.team}/agents`);
        if (opts.json) {
          json(res);
          return;
        }
        table(
          res.data.map((a) => ({ id: a.id, name: a.name, role: a.role, status: a.status })),
          ['id', 'name', 'role', 'status'],
        );
      } catch (err) {
        handleError(err);
      }
    });

  agent
    .command('get')
    .description('Get agent details')
    .argument('<id>', 'Agent ID')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('--json', 'Output raw JSON')
    .action(async (id: string, opts: { team: string; json?: boolean }) => {
      try {
        const res = await client.get<SingleResponse>(`/teams/${opts.team}/agents/${id}`);
        if (opts.json) {
          json(res);
          return;
        }
        table([res.data as unknown as Record<string, unknown>]);
      } catch (err) {
        handleError(err);
      }
    });
}
