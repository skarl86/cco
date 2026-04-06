import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { teams } from './teams.js';

export const approvals = sqliteTable('approvals', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  type: text('type').notNull(),
  requestedByAgentId: text('requested_by_agent_id'),
  status: text('status').notNull().default('pending'),
  payload: text('payload').notNull(),
  decisionNote: text('decision_note'),
  decidedAt: integer('decided_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
