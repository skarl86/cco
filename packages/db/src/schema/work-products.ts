import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { teams } from './teams.js';
import { tasks } from './tasks.js';

export const workProducts = sqliteTable('work_products', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  taskId: text('task_id').notNull().references(() => tasks.id),
  runId: text('run_id'),
  workspaceId: text('workspace_id'),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  externalId: text('external_id'),
  title: text('title').notNull(),
  url: text('url'),
  status: text('status').notNull().default('active'),
  reviewState: text('review_state').notNull().default('none'),
  isPrimary: integer('is_primary').notNull().default(0),
  healthStatus: text('health_status').notNull().default('unknown'),
  summary: text('summary'),
  metadata: text('metadata'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('wp_task_idx').on(table.teamId, table.taskId, table.type),
  index('wp_provider_idx').on(table.teamId, table.provider, table.externalId),
]);
