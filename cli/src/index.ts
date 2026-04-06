#!/usr/bin/env node
import { Command } from 'commander';
import { runDiagnostics } from './doctor.js';
import { ok as formatOk, warn as formatWarn, fail as formatFail } from './format.js';
import { showStatus } from './commands/status.js';
import { registerTeamCommands } from './commands/team.js';
import { registerAgentCommands } from './commands/agent.js';
import { registerTaskCommands } from './commands/task.js';
import { registerApprovalCommands } from './commands/approval.js';
import { registerActivityCommands } from './commands/activity.js';
import { registerDashboardCommand } from './commands/dashboard.js';
import { registerGoalCommands } from './commands/goal.js';
import { registerRunCommands } from './commands/run.js';
import { registerExportImportCommands } from './commands/export-import.js';
import { registerHeartbeatCommands } from './commands/heartbeat.js';
import { registerRoutineCommands } from './commands/routine.js';
import { registerWorkspaceCommands } from './commands/workspace.js';

const program = new Command();

program
  .name('cco')
  .description('Claude Code Orchestrator — AI agent team orchestration')
  .version('0.1.0');

program
  .command('doctor')
  .description('Run diagnostic checks')
  .action(async () => {
    const results = await runDiagnostics();
    for (const r of results) {
      if (r.status === 'pass') {
        formatOk(`${r.name}: ${r.message}`);
      } else if (r.status === 'warn') {
        formatWarn(`${r.name}: ${r.message}`);
      } else {
        formatFail(`${r.name}: ${r.message}`);
      }
    }
    const hasFail = results.some((r) => r.status === 'fail');
    if (hasFail) {
      process.exitCode = 1;
    }
  });

program
  .command('start')
  .description('Start the CCO server')
  .option('-p, --port <port>', 'Server port', '3100')
  .action(async (opts) => {
    const { execFileSync } = await import('node:child_process');
    const env = { ...process.env, CCO_PORT: opts.port };
    try {
      execFileSync('npx', ['tsx', '../server/src/index.ts'], { stdio: 'inherit', env, cwd: import.meta.dirname });
    } catch {
      process.exitCode = 1;
    }
  });

program
  .command('status')
  .description('Show server and team status')
  .action(showStatus);

registerTeamCommands(program);
registerAgentCommands(program);
registerTaskCommands(program);
registerApprovalCommands(program);
registerActivityCommands(program);
registerDashboardCommand(program);
registerGoalCommands(program);
registerRunCommands(program);
registerExportImportCommands(program);
registerHeartbeatCommands(program);
registerRoutineCommands(program);
registerWorkspaceCommands(program);

program.parse();
