import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { teams } from './teams.js';

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  name: text('name').notNull(),
  role: text('role').notNull().default('general'),
  title: text('title'),
  status: text('status').notNull().default('idle'),
  reportsTo: text('reports_to'),
  adapterType: text('adapter_type').notNull().default('claude_code'),
  adapterConfig: text('adapter_config').notNull().default('{}'),
  budgetMonthlyCents: integer('budget_monthly_cents').notNull().default(0),
  spentMonthlyCents: integer('spent_monthly_cents').notNull().default(0),
  pauseReason: text('pause_reason'),
  pausedAt: integer('paused_at'),
  lastHeartbeatAt: integer('last_heartbeat_at'),
  permissions: text('permissions').notNull().default('{}'),
  metadata: text('metadata'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('agents_team_status_idx').on(table.teamId, table.status),
]);
