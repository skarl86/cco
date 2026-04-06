import type { Command } from 'commander';
import { client } from '../client.js';
import { json, table, ok, handleError } from '../format.js';

interface Workspace {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly projectId?: string;
  readonly branch?: string;
  readonly createdAt: string;
}

interface ListResponse {
  readonly data: readonly Workspace[];
}

interface SingleResponse {
  readonly data: Workspace;
}

export function registerWorkspaceCommands(program: Command): void {
  const workspace = program.command('workspace').description('Manage workspaces');

  workspace
    .command('list')
    .description('List workspaces in a team')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { team: string; json?: boolean }) => {
      try {
        const res = await client.get<ListResponse>(`/teams/${opts.team}/workspaces`);
        if (opts.json) {
          json(res);
          return;
        }
        table(
          res.data.map((w) => ({
            id: w.id,
            name: w.name,
            status: w.status,
            project: w.projectId ?? '-',
            branch: w.branch ?? '-',
            created: w.createdAt,
          })),
          ['id', 'name', 'status', 'project', 'branch', 'created'],
        );
      } catch (err) {
        handleError(err);
      }
    });

  workspace
    .command('create')
    .description('Create a new workspace')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .requiredOption('-n, --name <name>', 'Workspace name')
    .option('--project <projectId>', 'Project ID')
    .option('--branch <branch>', 'Git branch')
    .option('--json', 'Output raw JSON')
    .action(
      async (opts: {
        team: string;
        name: string;
        project?: string;
        branch?: string;
        json?: boolean;
      }) => {
        try {
          const body: Record<string, string> = { name: opts.name };
          if (opts.project) body.projectId = opts.project;
          if (opts.branch) body.branch = opts.branch;

          const res = await client.post<SingleResponse>(
            `/teams/${opts.team}/workspaces`,
            body,
          );
          if (opts.json) {
            json(res);
            return;
          }
          ok(`Created workspace ${res.data.id} (${res.data.name})`);
        } catch (err) {
          handleError(err);
        }
      },
    );

  workspace
    .command('provision')
    .description('Provision a workspace')
    .argument('<id>', 'Workspace ID')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('--json', 'Output raw JSON')
    .action(async (id: string, opts: { team: string; json?: boolean }) => {
      try {
        const res = await client.post<SingleResponse>(
          `/teams/${opts.team}/workspaces/${id}/provision`,
        );
        if (opts.json) {
          json(res);
          return;
        }
        ok(`Provisioned workspace ${id} (status: ${res.data.status})`);
      } catch (err) {
        handleError(err);
      }
    });

  workspace
    .command('archive')
    .description('Archive a workspace')
    .argument('<id>', 'Workspace ID')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('--json', 'Output raw JSON')
    .action(async (id: string, opts: { team: string; json?: boolean }) => {
      try {
        const res = await client.post<SingleResponse>(
          `/teams/${opts.team}/workspaces/${id}/archive`,
        );
        if (opts.json) {
          json(res);
          return;
        }
        ok(`Archived workspace ${id} (status: ${res.data.status})`);
      } catch (err) {
        handleError(err);
      }
    });
}
