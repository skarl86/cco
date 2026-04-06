import type { Command } from 'commander';
import { client } from '../client.js';
import { json, table, ok, handleError } from '../format.js';

interface Task {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly priority?: string;
  readonly assigneeId?: string;
}

interface ListResponse {
  readonly data: readonly Task[];
}

interface SingleResponse {
  readonly data: Task;
}

export function registerTaskCommands(program: Command): void {
  const task = program.command('task').description('Manage tasks');

  task
    .command('list')
    .description('List tasks in a team')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('-s, --status <status>', 'Filter by status')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { team: string; status?: string; json?: boolean }) => {
      try {
        const query = opts.status ? `?status=${encodeURIComponent(opts.status)}` : '';
        const res = await client.get<ListResponse>(`/teams/${opts.team}/tasks${query}`);
        if (opts.json) {
          json(res);
          return;
        }
        table(
          res.data.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority ?? '-',
            assignee: t.assigneeId ?? '-',
          })),
          ['id', 'title', 'status', 'priority', 'assignee'],
        );
      } catch (err) {
        handleError(err);
      }
    });

  task
    .command('get')
    .description('Get task details')
    .argument('<id>', 'Task ID')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('--json', 'Output raw JSON')
    .action(async (id: string, opts: { team: string; json?: boolean }) => {
      try {
        const res = await client.get<SingleResponse>(`/teams/${opts.team}/tasks/${id}`);
        if (opts.json) {
          json(res);
          return;
        }
        table([res.data as unknown as Record<string, unknown>]);
      } catch (err) {
        handleError(err);
      }
    });

  task
    .command('create')
    .description('Create a new task')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .requiredOption('--title <title>', 'Task title')
    .option('--description <desc>', 'Task description')
    .option('--assignee <agentId>', 'Assignee agent ID')
    .option('--priority <priority>', 'Task priority')
    .option('--project <projectId>', 'Project ID')
    .option('--json', 'Output raw JSON')
    .action(
      async (opts: {
        team: string;
        title: string;
        description?: string;
        assignee?: string;
        priority?: string;
        project?: string;
        json?: boolean;
      }) => {
        try {
          const body: Record<string, string> = { title: opts.title };
          if (opts.description) body.description = opts.description;
          if (opts.assignee) body.assigneeId = opts.assignee;
          if (opts.priority) body.priority = opts.priority;
          if (opts.project) body.projectId = opts.project;

          const res = await client.post<SingleResponse>(`/teams/${opts.team}/tasks`, body);
          if (opts.json) {
            json(res);
            return;
          }
          ok(`Created task ${res.data.id}: ${res.data.title}`);
        } catch (err) {
          handleError(err);
        }
      },
    );

  task
    .command('update')
    .description('Update a task')
    .argument('<id>', 'Task ID')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('-s, --status <status>', 'New status')
    .option('--title <title>', 'New title')
    .option('--assignee <agentId>', 'New assignee')
    .option('--json', 'Output raw JSON')
    .action(
      async (
        id: string,
        opts: { team: string; status?: string; title?: string; assignee?: string; json?: boolean },
      ) => {
        try {
          const body: Record<string, string> = {};
          if (opts.status) body.status = opts.status;
          if (opts.title) body.title = opts.title;
          if (opts.assignee) body.assigneeId = opts.assignee;

          const res = await client.patch<SingleResponse>(`/teams/${opts.team}/tasks/${id}`, body);
          if (opts.json) {
            json(res);
            return;
          }
          ok(`Updated task ${res.data.id}`);
        } catch (err) {
          handleError(err);
        }
      },
    );

  task
    .command('comment')
    .description('Add a comment to a task')
    .argument('<id>', 'Task ID')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .requiredOption('--body <text>', 'Comment text')
    .option('--json', 'Output raw JSON')
    .action(async (id: string, opts: { team: string; body: string; json?: boolean }) => {
      try {
        const res = await client.post<{ data: { id: string } }>(
          `/teams/${opts.team}/tasks/${id}/comments`,
          { body: opts.body },
        );
        if (opts.json) {
          json(res);
          return;
        }
        ok(`Added comment ${res.data.id} to task ${id}`);
      } catch (err) {
        handleError(err);
      }
    });
}
