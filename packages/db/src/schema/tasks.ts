import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { teams } from './teams.js';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  projectId: text('project_id'),
  parentId: text('parent_id'),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('backlog'),
  priority: text('priority').notNull().default('medium'),
  assigneeAgentId: text('assignee_agent_id'),
  checkoutRunId: text('checkout_run_id'),
  executionLockedAt: integer('execution_locked_at'),
  taskNumber: integer('task_number'),
  identifier: text('identifier').unique(),
  originKind: text('origin_kind').notNull().default('manual'),
  startedAt: integer('started_at'),
  completedAt: integer('completed_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('tasks_team_status_idx').on(table.teamId, table.status),
  index('tasks_assignee_idx').on(table.teamId, table.assigneeAgentId, table.status),
]);
