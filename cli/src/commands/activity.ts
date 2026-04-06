import type { Command } from 'commander';
import { client } from '../client.js';
import { json, table, handleError } from '../format.js';

interface Activity {
  readonly id: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly action: string;
  readonly createdAt: string;
}

interface ListResponse {
  readonly data: readonly Activity[];
}

export function registerActivityCommands(program: Command): void {
  const activity = program.command('activity').description('View activity feed');

  activity
    .command('list')
    .description('List recent activity')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('--entity-type <type>', 'Filter by entity type')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { team: string; entityType?: string; json?: boolean }) => {
      try {
        const params = new URLSearchParams();
        if (opts.entityType) params.set('entityType', opts.entityType);
        const query = params.toString() ? `?${params.toString()}` : '';

        const res = await client.get<ListResponse>(`/teams/${opts.team}/activity${query}`);
        if (opts.json) {
          json(res);
          return;
        }
        table(
          res.data.map((a) => ({
            id: a.id,
            action: a.action,
            entityType: a.entityType,
            entityId: a.entityId,
            createdAt: a.createdAt,
          })),
          ['id', 'action', 'entityType', 'entityId', 'createdAt'],
        );
      } catch (err) {
        handleError(err);
      }
    });
}
