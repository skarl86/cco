import type { Command } from 'commander';
import * as p from '@clack/prompts';
import { client } from '../client.js';
import { json, table, ok, handleError } from '../format.js';

interface Routine {
  readonly id: string;
  readonly name: string;
  readonly schedule: string;
  readonly status: string;
  readonly agentId: string;
  readonly lastRunAt?: string;
}

interface ListResponse {
  readonly data: readonly Routine[];
}

interface SingleResponse {
  readonly data: Routine;
}

export function registerRoutineCommands(program: Command): void {
  const routine = program.command('routine').description('Manage routines');

  routine
    .command('list')
    .description('List routines in a team')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { team: string; json?: boolean }) => {
      try {
        const res = await client.get<ListResponse>(`/teams/${opts.team}/routines`);
        if (opts.json) {
          json(res);
          return;
        }
        table(
          res.data.map((r) => ({
            id: r.id,
            name: r.name,
            schedule: r.schedule,
            status: r.status,
            agent: r.agentId,
            lastRun: r.lastRunAt ?? '-',
          })),
          ['id', 'name', 'schedule', 'status', 'agent', 'lastRun'],
        );
      } catch (err) {
        handleError(err);
      }
    });

  routine
    .command('trigger')
    .description('Trigger a routine manually')
    .argument('<id>', 'Routine ID')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('--json', 'Output raw JSON')
    .action(async (id: string, opts: { team: string; json?: boolean }) => {
      try {
        const res = await client.post<SingleResponse>(
          `/teams/${opts.team}/routines/${id}/trigger`,
        );
        if (opts.json) {
          json(res);
          return;
        }
        ok(`Triggered routine ${id} (status: ${res.data.status})`);
      } catch (err) {
        handleError(err);
      }
    });

  routine
    .command('disable-all')
    .description('Pause all active routines in a team')
    .requiredOption('-t, --team <teamId>', 'Team ID')
    .option('-y, --yes', 'Skip confirmation')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { team: string; yes?: boolean; json?: boolean }) => {
      try {
        const res = await client.get<ListResponse>(`/teams/${opts.team}/routines`);
        const active = res.data.filter((r) => r.status === 'active');

        if (active.length === 0) {
          ok('No active routines to disable');
          return;
        }

        if (!opts.yes) {
          const confirmed = await p.confirm({
            message: `Pause ${active.length} active routine(s)?`,
          });
          if (p.isCancel(confirmed) || !confirmed) {
            ok('Cancelled');
            return;
          }
        }

        const results: Routine[] = [];
        for (const r of active) {
          const patched = await client.patch<SingleResponse>(
            `/teams/${opts.team}/routines/${r.id}`,
            { status: 'paused' },
          );
          results.push(patched.data);
        }

        if (opts.json) {
          json({ data: results });
          return;
        }

        ok(`Paused ${results.length} routine(s)`);
      } catch (err) {
        handleError(err);
      }
    });
}
