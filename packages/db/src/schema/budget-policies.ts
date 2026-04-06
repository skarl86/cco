import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { teams } from './teams.js';

export const budgetPolicies = sqliteTable('budget_policies', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  scopeType: text('scope_type').notNull(),
  scopeId: text('scope_id').notNull(),
  windowKind: text('window_kind').notNull(),
  amountCents: integer('amount_cents').notNull().default(0),
  warnPercent: integer('warn_percent').notNull().default(80),
  hardStopEnabled: integer('hard_stop_enabled').notNull().default(1),
  isActive: integer('is_active').notNull().default(1),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
