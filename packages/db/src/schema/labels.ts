import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { teams } from './teams.js';

export const labels = sqliteTable('labels', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  name: text('name').notNull(),
  color: text('color').notNull().default('#6B7280'),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('labels_team_name_uq').on(table.teamId, table.name),
]);
