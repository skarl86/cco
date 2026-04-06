import { sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
import { tasks } from './tasks.js';
import { labels } from './labels.js';

export const taskLabels = sqliteTable('task_labels', {
  taskId: text('task_id').notNull().references(() => tasks.id),
  labelId: text('label_id').notNull().references(() => labels.id),
}, (table) => [
  primaryKey({ columns: [table.taskId, table.labelId] }),
]);
