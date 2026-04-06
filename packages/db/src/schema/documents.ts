import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { teams } from './teams.js';
import { tasks } from './tasks.js';

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  taskId: text('task_id').notNull().references(() => tasks.id),
  version: integer('version').notNull().default(1),
  title: text('title'),
  content: text('content').notNull(),
  authorType: text('author_type').notNull().default('system'),
  authorAgentId: text('author_agent_id'),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('documents_task_idx').on(table.taskId, table.version),
]);
