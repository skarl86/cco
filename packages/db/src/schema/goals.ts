import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { teams } from './teams.js';
import { projects } from './projects.js';

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  projectId: text('project_id').references(() => projects.id),
  parentId: text('parent_id'),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('active'),
  priority: text('priority').notNull().default('medium'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('goals_team_idx').on(table.teamId),
  index('goals_project_idx').on(table.teamId, table.projectId),
]);
