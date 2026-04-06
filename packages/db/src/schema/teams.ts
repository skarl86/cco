import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('active'),
  taskPrefix: text('task_prefix').notNull().default('CCO'),
  taskCounter: integer('task_counter').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
