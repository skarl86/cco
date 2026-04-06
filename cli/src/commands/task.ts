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
    .option('-s, --status <status>', 'Filter by status (comma-separated)')
    .option('--project <projectId>', 'Filter by project ID')
    .option('--q <search>', 'Search tasks by title/description')
    .option('--origin <kind>', 'Filter by origin kind')
    .option('--json', 'Output raw JSON')
    .action(
      async (opts: {
        team: string;
        status?: string;
        project?: string;
        q?: string;
        origin?: string;
        json?: boolean;
      }) => {
        try {
          const params = new URLSearchParams();
          if (opts.status) params.set('status', opts.status);
          if (opts.project) params.set('projectId', opts.project);
          if (opts.q) params.set('q', opts.q);
          if (opts.origin) params.set('originKind', opts.origin);
          const query = params.toString() ? `?${params.toString()}` : '';

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
      },
    );

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
    .option('--goal <goalId>', 'Goal ID')
    .option('--billing-code <code>', 'Billing code')
    .option('--json', 'Output raw JSON')
    .action(
      async (opts: {
        team: string;
        title: string;
        description?: string;
        assignee?: string;
        priority?: string;
        project?: string;
        goal?: string;
        billingCode?: string;
        json?: boolean;
      }) => {
        try {
          const body: Record<string, string> = { title: opts.title };
          if (opts.description) body.description = opts.description;
          if (opts.assignee) body.assigneeId = opts.assignee;
          if (opts.priority) body.priority = opts.priority;
          if (opts.project) body.projectId = opts.project;
          if (opts.goal) body.goalId = opts.goal;
          if (opts.billingCode) body.billingCode = opts.billingCode;

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
    .option('--reopen', 'Reopen a done/cancelled task before commenting')
    .option('--interrupt', 'Mark task as blocked before commenting')
    .option('--json', 'Output raw JSON')
    .action(
      async (
        id: string,
        opts: { team: string; body: string; reopen?: boolean; interrupt?: boolean; json?: boolean },
      ) => {
        try {
          if (opts.reopen) {
            await client.patch(`/teams/${opts.team}/tasks/${id}`, { status: 'backlog' });
          }
          if (opts.interrupt) {
            await client.patch(`/teams/${opts.team}/tasks/${id}`, { status: 'blocked' });
          }

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
      },
    );

  task
    .command('checkout')
    .description('Check out a task for agent execution')
    .argument('<id>', 'Task ID')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .requiredOption('--agent <agentId>', 'Agent ID')
    .option('--json', 'Output raw JSON')
    .action(
      async (id: string, opts: { team: string; agent: string; json?: boolean }) => {
        try {
          const res = await client.post<SingleResponse>(
            `/teams/${opts.team}/tasks/${id}/checkout`,
            { agentId: opts.agent },
          );
          if (opts.json) {
            json(res);
            return;
          }
          ok(`Checked out task ${id} to agent ${opts.agent}`);
        } catch (err) {
          handleError(err);
        }
      },
    );

  task
    .command('release')
    .description('Release a checked-out task')
    .argument('<id>', 'Task ID')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('--status <newStatus>', 'Status after release (e.g., todo, done)')
    .option('--json', 'Output raw JSON')
    .action(
      async (id: string, opts: { team: string; status?: string; json?: boolean }) => {
        try {
          const res = await client.post<SingleResponse>(
            `/teams/${opts.team}/tasks/${id}/release`,
            { newStatus: opts.status },
          );
          if (opts.json) {
            json(res);
            return;
          }
          ok(`Released task ${id}`);
        } catch (err) {
          handleError(err);
        }
      },
    );
}
