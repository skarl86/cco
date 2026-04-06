import type { Command } from 'commander';
import fs from 'node:fs';
import { client } from '../client.js';
import { json, ok, handleError } from '../format.js';

interface ExportResponse {
  readonly data: Record<string, unknown>;
}

interface ImportResponse {
  readonly data: {
    readonly agents: number;
    readonly projects: number;
    readonly tasks: number;
    readonly goals: number;
    readonly routines: number;
  };
}

export function registerExportImportCommands(program: Command): void {
  program
    .command('export')
    .description('Export team data to JSON')
    .requiredOption('--team <teamId>', 'Team ID to export')
    .option('--out <file>', 'Output file path (stdout if omitted)')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { team: string; out?: string; json?: boolean }) => {
      try {
        const res = await client.post<ExportResponse>(`/teams/${opts.team}/export`);
        const output = JSON.stringify(res.data, null, 2);

        if (opts.out) {
          fs.writeFileSync(opts.out, output, 'utf-8');
          ok(`Exported team ${opts.team} to ${opts.out}`);
        } else if (opts.json) {
          json(res.data);
        } else {
          json(res.data);
        }
      } catch (err) {
        handleError(err);
      }
    });

  program
    .command('import')
    .description('Import team data from JSON')
    .requiredOption('--team <teamId>', 'Target team ID')
    .requiredOption('--from <file>', 'Input file path')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { team: string; from: string; json?: boolean }) => {
      try {
        const raw = fs.readFileSync(opts.from, 'utf-8');
        const data = JSON.parse(raw) as Record<string, unknown>;

        const res = await client.post<ImportResponse>(`/teams/${opts.team}/import`, data);

        if (opts.json) {
          json(res);
          return;
        }

        const d = res.data;
        ok(
          `Imported into team ${opts.team}: ` +
            `${d.agents} agents, ${d.projects} projects, ${d.tasks} tasks, ` +
            `${d.goals} goals, ${d.routines} routines`,
        );
      } catch (err) {
        handleError(err);
      }
    });
}
