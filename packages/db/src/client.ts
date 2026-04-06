import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema/index.js';

export interface Database {
  readonly db: ReturnType<typeof drizzle<typeof schema>>;
  close(): void;
}

const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    task_prefix TEXT NOT NULL DEFAULT 'CCO',
    task_counter INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id),
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'general',
    title TEXT,
    status TEXT NOT NULL DEFAULT 'idle',
    reports_to TEXT,
    adapter_type TEXT NOT NULL DEFAULT 'claude_code',
    adapter_config TEXT NOT NULL DEFAULT '{}',
    budget_monthly_cents INTEGER NOT NULL DEFAULT 0,
    spent_monthly_cents INTEGER NOT NULL DEFAULT 0,
    pause_reason TEXT,
    paused_at INTEGER,
    last_heartbeat_at INTEGER,
    permissions TEXT NOT NULL DEFAULT '{}',
    metadata TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS agents_team_status_idx ON agents(team_id, status);

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id),
    project_id TEXT,
    parent_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'backlog',
    priority TEXT NOT NULL DEFAULT 'medium',
    assignee_agent_id TEXT,
    checkout_run_id TEXT,
    execution_locked_at INTEGER,
    task_number INTEGER,
    identifier TEXT UNIQUE,
    origin_kind TEXT NOT NULL DEFAULT 'manual',
    started_at INTEGER,
    completed_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS tasks_team_status_idx ON tasks(team_id, status);
  CREATE INDEX IF NOT EXISTS tasks_assignee_idx ON tasks(team_id, assignee_agent_id, status);

  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id),
    agent_id TEXT NOT NULL REFERENCES agents(id),
    task_id TEXT,
    invocation_source TEXT NOT NULL DEFAULT 'on_demand',
    status TEXT NOT NULL DEFAULT 'queued',
    started_at INTEGER,
    finished_at INTEGER,
    exit_code INTEGER,
    error TEXT,
    error_code TEXT,
    usage_json TEXT,
    result_json TEXT,
    session_id_before TEXT,
    session_id_after TEXT,
    stdout_excerpt TEXT,
    stderr_excerpt TEXT,
    log_path TEXT,
    process_pid INTEGER,
    context_snapshot TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS runs_team_status_idx ON runs(team_id, status);
  CREATE INDEX IF NOT EXISTS runs_agent_idx ON runs(agent_id, status);

  CREATE TABLE IF NOT EXISTS cost_events (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id),
    agent_id TEXT NOT NULL REFERENCES agents(id),
    task_id TEXT,
    project_id TEXT,
    run_id TEXT,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    billing_type TEXT NOT NULL DEFAULT 'subscription',
    input_tokens INTEGER NOT NULL DEFAULT 0,
    cached_input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_cents INTEGER NOT NULL,
    occurred_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS costs_agent_time_idx ON cost_events(team_id, agent_id, occurred_at);
  CREATE INDEX IF NOT EXISTS costs_time_idx ON cost_events(team_id, occurred_at);

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    repo_url TEXT,
    repo_path TEXT,
    base_branch TEXT DEFAULT 'main',
    worktree_parent_dir TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id),
    type TEXT NOT NULL,
    requested_by_agent_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    payload TEXT NOT NULL,
    decision_note TEXT,
    decided_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS budget_policies (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id),
    scope_type TEXT NOT NULL,
    scope_id TEXT NOT NULL,
    window_kind TEXT NOT NULL,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    warn_percent INTEGER NOT NULL DEFAULT 80,
    hard_stop_enabled INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS routines (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id),
    project_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    assignee_agent_id TEXT NOT NULL,
    cron_expression TEXT,
    timezone TEXT DEFAULT 'Asia/Seoul',
    status TEXT NOT NULL DEFAULT 'active',
    concurrency_policy TEXT NOT NULL DEFAULT 'coalesce',
    next_run_at INTEGER,
    last_triggered_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS task_comments (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id),
    task_id TEXT NOT NULL REFERENCES tasks(id),
    author_agent_id TEXT,
    author_type TEXT NOT NULL DEFAULT 'system',
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS comments_task_idx ON task_comments(task_id, created_at);

  CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id),
    actor_type TEXT NOT NULL,
    actor_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    detail TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS activity_team_time_idx ON activity_log(team_id, created_at);
`;

export function createDatabase(path: string): Database {
  const sqlite = new BetterSqlite3(path);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.exec(CREATE_TABLES_SQL);

  const db = drizzle(sqlite, { schema });

  return {
    db,
    close() {
      sqlite.close();
    },
  };
}
