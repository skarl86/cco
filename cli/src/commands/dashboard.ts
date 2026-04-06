import type { Command } from 'commander';
import { client } from '../client.js';
import { json, table, ok, handleError } from '../format.js';

interface DashboardData {
  readonly agents: { readonly total: number; readonly running: number };
  readonly tasks: { readonly open: number; readonly total: number };
  readonly runs: { readonly total: number };
  readonly approvals: { readonly pending: number };
}

interface DashboardResponse {
  readonly data: DashboardData;
}

export function registerDashboardCommand(program: Command): void {
  program
    .command('dashboard')
    .description('Show team dashboard')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { team: string; json?: boolean }) => {
      try {
        const res = await client.get<DashboardResponse>(`/teams/${opts.team}/dashboard`);
        if (opts.json) {
          json(res);
          return;
        }

        const d = res.data;
        ok(`Dashboard for team ${opts.team}`);
        table(
          [
            { metric: 'Agents (running / total)', value: `${d.agents.running} / ${d.agents.total}` },
            { metric: 'Tasks (open / total)', value: `${d.tasks.open} / ${d.tasks.total}` },
            { metric: 'Runs', value: String(d.runs.total) },
            { metric: 'Pending approvals', value: String(d.approvals.pending) },
          ],
          ['metric', 'value'],
        );
      } catch (err) {
        handleError(err);
      }
    });
}
