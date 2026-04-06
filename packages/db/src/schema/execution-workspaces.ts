import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { teams } from './teams.js';
import { projects } from './projects.js';

export const executionWorkspaces = sqliteTable('execution_workspaces', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  projectId: text('project_id').references(() => projects.id),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pending'), // pending, provisioning, ready, error, archived
  workspacePath: text('workspace_path'),
  branchName: text('branch_name'),
  baseRef: text('base_ref').default('main'),
  error: text('error'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('workspaces_team_idx').on(table.teamId),
  index('workspaces_project_idx').on(table.teamId, table.projectId),
]);
