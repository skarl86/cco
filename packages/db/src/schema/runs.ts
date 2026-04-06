import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { teams } from './teams.js';
import { agents } from './agents.js';

export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  agentId: text('agent_id').notNull().references(() => agents.id),
  taskId: text('task_id'),
  invocationSource: text('invocation_source').notNull().default('on_demand'),
  status: text('status').notNull().default('queued'),
  startedAt: integer('started_at'),
  finishedAt: integer('finished_at'),
  exitCode: integer('exit_code'),
  error: text('error'),
  errorCode: text('error_code'),
  usageJson: text('usage_json'),
  resultJson: text('result_json'),
  sessionIdBefore: text('session_id_before'),
  sessionIdAfter: text('session_id_after'),
  stdoutExcerpt: text('stdout_excerpt'),
  stderrExcerpt: text('stderr_excerpt'),
  logPath: text('log_path'),
  processPid: integer('process_pid'),
  contextSnapshot: text('context_snapshot'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('runs_team_status_idx').on(table.teamId, table.status),
  index('runs_agent_idx').on(table.agentId, table.status),
]);
