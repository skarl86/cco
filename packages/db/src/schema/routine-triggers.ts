import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { teams } from './teams.js';
import { routines } from './routines.js';

export const routineTriggers = sqliteTable('routine_triggers', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  routineId: text('routine_id').notNull().references(() => routines.id),
  triggerType: text('trigger_type').notNull().default('cron'),
  cronExpression: text('cron_expression'),
  publicId: text('public_id').unique(),
  isActive: integer('is_active').notNull().default(1),
  lastFiredAt: integer('last_fired_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
