#!/usr/bin/env node
import { Command } from 'commander';
import { runDiagnostics } from './doctor.js';
import { showStatus } from './commands/status.js';

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
      const icon = r.status === 'ok' ? 'PASS' : r.status === 'warn' ? 'WARN' : 'FAIL';
      console.log(`[${icon}] ${r.name}: ${r.message}`);
    }
    const hasError = results.some((r) => r.status === 'error');
    if (hasError) {
      process.exitCode = 1;
    }
  });

program
  .command('start')
  .description('Start the CCO server')
  .option('-p, --port <port>', 'Server port', '3100')
  .action(async (opts) => {
    process.env.CCO_PORT = opts.port;
    await import('@cco/server');
  });

program
  .command('status')
  .description('Show server and team status')
  .action(showStatus);

program.parse();
