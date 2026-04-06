import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { teams } from './teams.js';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('active'),
  repoUrl: text('repo_url'),
  repoPath: text('repo_path'),
  baseBranch: text('base_branch').default('main'),
  worktreeParentDir: text('worktree_parent_dir'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
