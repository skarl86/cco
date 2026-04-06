import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { teams } from './teams.js';

export const feedback = sqliteTable('feedback', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  vote: text('vote').notNull(),
  reason: text('reason'),
  actorType: text('actor_type').notNull().default('user'),
  actorId: text('actor_id'),
  payload: text('payload'),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('feedback_target_idx').on(table.targetType, table.targetId),
  index('feedback_team_idx').on(table.teamId, table.createdAt),
]);
