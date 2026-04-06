import type { Command } from 'commander';
import { client } from '../client.js';
import { json, table, ok, handleError } from '../format.js';

interface Goal {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly projectId?: string;
  readonly parentId?: string;
}

interface ListResponse {
  readonly data: readonly Goal[];
}

interface SingleResponse {
  readonly data: Goal;
}

export function registerGoalCommands(program: Command): void {
  const goal = program.command('goal').description('Manage goals');

  goal
    .command('list')
    .description('List goals')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('--project <projectId>', 'Filter by project')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { team: string; project?: string; json?: boolean }) => {
      try {
        const params = new URLSearchParams();
        if (opts.project) params.set('projectId', opts.project);
        const query = params.toString() ? `?${params.toString()}` : '';

        const res = await client.get<ListResponse>(`/teams/${opts.team}/goals${query}`);
        if (opts.json) {
          json(res);
          return;
        }
        table(
          res.data.map((g) => ({
            id: g.id,
            title: g.title,
            status: g.status,
            project: g.projectId ?? '-',
            parent: g.parentId ?? '-',
          })),
          ['id', 'title', 'status', 'project', 'parent'],
        );
      } catch (err) {
        handleError(err);
      }
    });

  goal
    .command('create')
    .description('Create a new goal')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .requiredOption('--title <title>', 'Goal title')
    .option('--project <projectId>', 'Project ID')
    .option('--parent <goalId>', 'Parent goal ID')
    .option('--json', 'Output raw JSON')
    .action(
      async (opts: {
        team: string;
        title: string;
        project?: string;
        parent?: string;
        json?: boolean;
      }) => {
        try {
          const body: Record<string, string> = { title: opts.title };
          if (opts.project) body.projectId = opts.project;
          if (opts.parent) body.parentId = opts.parent;

          const res = await client.post<SingleResponse>(`/teams/${opts.team}/goals`, body);
          if (opts.json) {
            json(res);
            return;
          }
          ok(`Created goal ${res.data.id}: ${res.data.title}`);
        } catch (err) {
          handleError(err);
        }
      },
    );
}
