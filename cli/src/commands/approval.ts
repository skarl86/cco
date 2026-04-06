import type { Command } from 'commander';
import { client } from '../client.js';
import { json, table, ok, handleError } from '../format.js';

interface Approval {
  readonly id: string;
  readonly taskId: string;
  readonly status: string;
  readonly requestedBy: string;
  readonly createdAt: string;
}

interface ListResponse {
  readonly data: readonly Approval[];
}

interface SingleResponse {
  readonly data: Approval;
}

export function registerApprovalCommands(program: Command): void {
  const approval = program.command('approval').description('Manage approvals');

  approval
    .command('list')
    .description('List approvals')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('-s, --status <status>', 'Filter by status (e.g. pending)')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { team: string; status?: string; json?: boolean }) => {
      try {
        const query = opts.status ? `?status=${encodeURIComponent(opts.status)}` : '';
        const res = await client.get<ListResponse>(`/teams/${opts.team}/approvals${query}`);
        if (opts.json) {
          json(res);
          return;
        }
        table(
          res.data.map((a) => ({
            id: a.id,
            task: a.taskId,
            status: a.status,
            requestedBy: a.requestedBy,
            createdAt: a.createdAt,
          })),
          ['id', 'task', 'status', 'requestedBy', 'createdAt'],
        );
      } catch (err) {
        handleError(err);
      }
    });

  approval
    .command('get')
    .description('Get approval details')
    .argument('<id>', 'Approval ID')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('--json', 'Output raw JSON')
    .action(async (id: string, opts: { team: string; json?: boolean }) => {
      try {
        const res = await client.get<SingleResponse>(`/teams/${opts.team}/approvals/${id}`);
        if (opts.json) {
          json(res);
          return;
        }
        table([res.data as unknown as Record<string, unknown>]);
      } catch (err) {
        handleError(err);
      }
    });

  approval
    .command('approve')
    .description('Approve a pending approval')
    .argument('<id>', 'Approval ID')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('--note <text>', 'Approval note')
    .option('--json', 'Output raw JSON')
    .action(async (id: string, opts: { team: string; note?: string; json?: boolean }) => {
      try {
        const body: Record<string, string> = { decision: 'approved' };
        if (opts.note) body.note = opts.note;

        const res = await client.post<SingleResponse>(
          `/teams/${opts.team}/approvals/${id}/decision`,
          body,
        );
        if (opts.json) {
          json(res);
          return;
        }
        ok(`Approved ${id}`);
      } catch (err) {
        handleError(err);
      }
    });

  approval
    .command('reject')
    .description('Reject a pending approval')
    .argument('<id>', 'Approval ID')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('--note <text>', 'Rejection note')
    .option('--json', 'Output raw JSON')
    .action(async (id: string, opts: { team: string; note?: string; json?: boolean }) => {
      try {
        const body: Record<string, string> = { decision: 'rejected' };
        if (opts.note) body.note = opts.note;

        const res = await client.post<SingleResponse>(
          `/teams/${opts.team}/approvals/${id}/decision`,
          body,
        );
        if (opts.json) {
          json(res);
          return;
        }
        ok(`Rejected ${id}`);
      } catch (err) {
        handleError(err);
      }
    });
}
