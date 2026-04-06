import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { teams } from './teams.js';

export const routines = sqliteTable('routines', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  projectId: text('project_id'),
  title: text('title').notNull(),
  description: text('description'),
  assigneeAgentId: text('assignee_agent_id').notNull(),
  cronExpression: text('cron_expression'),
  timezone: text('timezone').default('Asia/Seoul'),
  status: text('status').notNull().default('active'),
  concurrencyPolicy: text('concurrency_policy').notNull().default('coalesce'),
  nextRunAt: integer('next_run_at'),
  lastTriggeredAt: integer('last_triggered_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
