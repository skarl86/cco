import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { teams } from './teams.js';
import { executionWorkspaces } from './execution-workspaces.js';

export const workspaceRuns = sqliteTable('workspace_runs', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  workspaceId: text('workspace_id').notNull().references(() => executionWorkspaces.id),
  runId: text('run_id'),
  agentId: text('agent_id'),
  status: text('status').notNull().default('pending'),
  startedAt: integer('started_at'),
  finishedAt: integer('finished_at'),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('workspace_runs_workspace_idx').on(table.workspaceId),
]);
