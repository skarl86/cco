import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { teams } from './teams.js';

export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  actorType: text('actor_type').notNull(),
  actorId: text('actor_id'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  detail: text('detail'),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('activity_team_time_idx').on(table.teamId, table.createdAt),
]);
