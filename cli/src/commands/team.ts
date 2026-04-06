import type { Command } from 'commander';
import * as p from '@clack/prompts';
import { client } from '../client.js';
import { json, table, ok, handleError } from '../format.js';

interface Team {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly createdAt: string;
}

interface ListResponse {
  readonly data: readonly Team[];
}

interface SingleResponse {
  readonly data: Team;
}

export function registerTeamCommands(program: Command): void {
  const team = program.command('team').description('Manage teams');

  team
    .command('list')
    .description('List all teams')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { json?: boolean }) => {
      try {
        const res = await client.get<ListResponse>('/teams');
        if (opts.json) {
          json(res);
          return;
        }
        table(
          res.data.map((t) => ({ id: t.id, name: t.name, description: t.description ?? '-' })),
          ['id', 'name', 'description'],
        );
      } catch (err) {
        handleError(err);
      }
    });

  team
    .command('get')
    .description('Get team details')
    .argument('<id>', 'Team ID')
    .option('--json', 'Output raw JSON')
    .action(async (id: string, opts: { json?: boolean }) => {
      try {
        const res = await client.get<SingleResponse>(`/teams/${id}`);
        if (opts.json) {
          json(res);
          return;
        }
        table([res.data as unknown as Record<string, unknown>]);
      } catch (err) {
        handleError(err);
      }
    });

  team
    .command('delete')
    .description('Delete a team')
    .argument('<id>', 'Team ID')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (id: string, opts: { yes?: boolean }) => {
      try {
        if (!opts.yes) {
          const confirmed = await p.confirm({ message: `Delete team ${id}?` });
          if (p.isCancel(confirmed) || !confirmed) {
            ok('Cancelled');
            return;
          }
        }
        await client.delete(`/teams/${id}`);
        ok(`Deleted team ${id}`);
      } catch (err) {
        handleError(err);
      }
    });
}
