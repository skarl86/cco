import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { teams } from './teams.js';
import { routines } from './routines.js';

export const routineRuns = sqliteTable('routine_runs', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  routineId: text('routine_id').notNull().references(() => routines.id),
  triggerId: text('trigger_id'),
  taskId: text('task_id'),
  status: text('status').notNull().default('pending'),
  error: text('error'),
  startedAt: integer('started_at'),
  finishedAt: integer('finished_at'),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('routine_runs_routine_idx').on(table.routineId, table.createdAt),
]);
