import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { teams } from './teams.js';
import { tasks } from './tasks.js';

export const taskComments = sqliteTable('task_comments', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  taskId: text('task_id').notNull().references(() => tasks.id),
  authorAgentId: text('author_agent_id'),
  authorType: text('author_type').notNull().default('system'),
  body: text('body').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('comments_task_idx').on(table.taskId, table.createdAt),
]);
