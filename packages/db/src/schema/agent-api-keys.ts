import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { agents } from './agents.js';
import { teams } from './teams.js';

export const agentApiKeys = sqliteTable('agent_api_keys', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  agentId: text('agent_id').notNull().references(() => agents.id),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(),
  keyPrefix: text('key_prefix').notNull(),
  lastUsedAt: integer('last_used_at'),
  createdAt: integer('created_at').notNull(),
});
