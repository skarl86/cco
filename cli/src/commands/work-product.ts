import type { Command } from 'commander';
import { client } from '../client.js';
import { json, table, ok, handleError } from '../format.js';

interface WorkProduct {
  readonly id: string;
  readonly type: string;
  readonly provider: string;
  readonly title: string;
  readonly status: string;
  readonly reviewState: string;
  readonly isPrimary: number;
  readonly url?: string;
  readonly externalId?: string;
}

interface ListResponse {
  readonly data: readonly WorkProduct[];
}

interface SingleResponse {
  readonly data: WorkProduct;
}

export function registerWorkProductCommands(program: Command): void {
  const wp = program.command('work-product').description('Manage work products');

  wp
    .command('list')
    .description('List work products for a task')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .requiredOption('--task <taskId>', 'Task ID')
    .option('--type <type>', 'Filter by type')
    .option('--json', 'Output raw JSON')
    .action(
      async (opts: {
        team: string;
        task: string;
        type?: string;
        json?: boolean;
      }) => {
        try {
          const params = new URLSearchParams();
          if (opts.type) params.set('type', opts.type);
          const query = params.toString() ? `?${params.toString()}` : '';

          const res = await client.get<ListResponse>(
            `/teams/${opts.team}/tasks/${opts.task}/work-products${query}`,
          );
          if (opts.json) {
            json(res);
            return;
          }
          table(
            res.data.map((w) => ({
              id: w.id,
              type: w.type,
              provider: w.provider,
              title: w.title,
              status: w.status,
              review: w.reviewState,
              primary: w.isPrimary ? 'yes' : '-',
            })),
            ['id', 'type', 'provider', 'title', 'status', 'review', 'primary'],
          );
        } catch (err) {
          handleError(err);
        }
      },
    );

  wp
    .command('create')
    .description('Create a work product')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .requiredOption('--task <taskId>', 'Task ID')
    .requiredOption('--type <type>', 'Work product type (pull_request, commit, branch, artifact, document, preview_url)')
    .requiredOption('--provider <provider>', 'Provider (github, local, etc.)')
    .requiredOption('--title <title>', 'Title')
    .option('--url <url>', 'URL')
    .option('--external-id <id>', 'External ID')
    .option('--primary', 'Mark as primary')
    .option('--status <status>', 'Status')
    .option('--json', 'Output raw JSON')
    .action(
      async (opts: {
        team: string;
        task: string;
        type: string;
        provider: string;
        title: string;
        url?: string;
        externalId?: string;
        primary?: boolean;
        status?: string;
        json?: boolean;
      }) => {
        try {
          const body: Record<string, unknown> = {
            type: opts.type,
            provider: opts.provider,
            title: opts.title,
          };
          if (opts.url) body.url = opts.url;
          if (opts.externalId) body.externalId = opts.externalId;
          if (opts.primary) body.isPrimary = true;
          if (opts.status) body.status = opts.status;

          const res = await client.post<SingleResponse>(
            `/teams/${opts.team}/tasks/${opts.task}/work-products`,
            body,
          );
          if (opts.json) {
            json(res);
            return;
          }
          ok(`Created work product ${res.data.id}: ${res.data.title}`);
        } catch (err) {
          handleError(err);
        }
      },
    );

  wp
    .command('review')
    .description('Update the review state of a work product')
    .argument('<id>', 'Work product ID')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .requiredOption('--state <state>', 'Review state (approved, changes_requested)')
    .option('--json', 'Output raw JSON')
    .action(
      async (
        id: string,
        opts: { team: string; state: string; json?: boolean },
      ) => {
        try {
          const res = await client.patch<SingleResponse>(
            `/teams/${opts.team}/work-products/${id}`,
            { reviewState: opts.state },
          );
          if (opts.json) {
            json(res);
            return;
          }
          ok(`Updated work product ${res.data.id} review state to ${res.data.reviewState}`);
        } catch (err) {
          handleError(err);
        }
      },
    );
}
