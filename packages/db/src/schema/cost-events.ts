import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { teams } from './teams.js';
import { agents } from './agents.js';

export const costEvents = sqliteTable('cost_events', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  agentId: text('agent_id').notNull().references(() => agents.id),
  taskId: text('task_id'),
  projectId: text('project_id'),
  runId: text('run_id'),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  billingType: text('billing_type').notNull().default('subscription'),
  inputTokens: integer('input_tokens').notNull().default(0),
  cachedInputTokens: integer('cached_input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  costCents: integer('cost_cents').notNull(),
  occurredAt: integer('occurred_at').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('costs_agent_time_idx').on(table.teamId, table.agentId, table.occurredAt),
  index('costs_time_idx').on(table.teamId, table.occurredAt),
]);
