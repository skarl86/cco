CREATE TABLE `activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`detail` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `activity_team_time_idx` ON `activity_log` (`team_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `agent_api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`name` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`last_used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'general' NOT NULL,
	`title` text,
	`status` text DEFAULT 'idle' NOT NULL,
	`reports_to` text,
	`adapter_type` text DEFAULT 'claude_code' NOT NULL,
	`adapter_config` text DEFAULT '{}' NOT NULL,
	`budget_monthly_cents` integer DEFAULT 0 NOT NULL,
	`spent_monthly_cents` integer DEFAULT 0 NOT NULL,
	`pause_reason` text,
	`paused_at` integer,
	`last_heartbeat_at` integer,
	`permissions` text DEFAULT '{}' NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `agents_team_status_idx` ON `agents` (`team_id`,`status`);--> statement-breakpoint
CREATE TABLE `approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`type` text NOT NULL,
	`requested_by_agent_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`payload` text NOT NULL,
	`decision_note` text,
	`decided_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `budget_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`scope_type` text NOT NULL,
	`scope_id` text NOT NULL,
	`window_kind` text NOT NULL,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`warn_percent` integer DEFAULT 80 NOT NULL,
	`hard_stop_enabled` integer DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cost_events` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`task_id` text,
	`project_id` text,
	`run_id` text,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`billing_type` text DEFAULT 'subscription' NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`cached_input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`cost_cents` integer NOT NULL,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `costs_agent_time_idx` ON `cost_events` (`team_id`,`agent_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `costs_time_idx` ON `cost_events` (`team_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`task_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`title` text,
	`content` text NOT NULL,
	`author_type` text DEFAULT 'system' NOT NULL,
	`author_agent_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `documents_task_idx` ON `documents` (`task_id`,`version`);--> statement-breakpoint
CREATE TABLE `execution_workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`project_id` text,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`workspace_path` text,
	`branch_name` text,
	`base_ref` text DEFAULT 'main',
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workspaces_team_idx` ON `execution_workspaces` (`team_id`);--> statement-breakpoint
CREATE INDEX `workspaces_project_idx` ON `execution_workspaces` (`team_id`,`project_id`);--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`vote` text NOT NULL,
	`reason` text,
	`actor_type` text DEFAULT 'user' NOT NULL,
	`actor_id` text,
	`payload` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `feedback_target_idx` ON `feedback` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `feedback_team_idx` ON `feedback` (`team_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`project_id` text,
	`parent_id` text,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `goals_team_idx` ON `goals` (`team_id`);--> statement-breakpoint
CREATE INDEX `goals_project_idx` ON `goals` (`team_id`,`project_id`);--> statement-breakpoint
CREATE TABLE `labels` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#6B7280' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `labels_team_name_uq` ON `labels` (`team_id`,`name`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`repo_url` text,
	`repo_path` text,
	`base_branch` text DEFAULT 'main',
	`worktree_parent_dir` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `routine_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`routine_id` text NOT NULL,
	`trigger_id` text,
	`task_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error` text,
	`started_at` integer,
	`finished_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `routine_runs_routine_idx` ON `routine_runs` (`routine_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `routine_triggers` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`routine_id` text NOT NULL,
	`trigger_type` text DEFAULT 'cron' NOT NULL,
	`cron_expression` text,
	`public_id` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`last_fired_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `routine_triggers_public_id_unique` ON `routine_triggers` (`public_id`);--> statement-breakpoint
CREATE TABLE `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`project_id` text,
	`title` text NOT NULL,
	`description` text,
	`assignee_agent_id` text NOT NULL,
	`cron_expression` text,
	`timezone` text DEFAULT 'Asia/Seoul',
	`status` text DEFAULT 'active' NOT NULL,
	`concurrency_policy` text DEFAULT 'coalesce' NOT NULL,
	`next_run_at` integer,
	`last_triggered_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`task_id` text,
	`invocation_source` text DEFAULT 'on_demand' NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`started_at` integer,
	`finished_at` integer,
	`exit_code` integer,
	`error` text,
	`error_code` text,
	`usage_json` text,
	`result_json` text,
	`session_id_before` text,
	`session_id_after` text,
	`stdout_excerpt` text,
	`stderr_excerpt` text,
	`log_path` text,
	`process_pid` integer,
	`context_snapshot` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `runs_team_status_idx` ON `runs` (`team_id`,`status`);--> statement-breakpoint
CREATE INDEX `runs_agent_idx` ON `runs` (`agent_id`,`status`);--> statement-breakpoint
CREATE TABLE `task_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`task_id` text NOT NULL,
	`author_agent_id` text,
	`author_type` text DEFAULT 'system' NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `comments_task_idx` ON `task_comments` (`task_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `task_labels` (
	`task_id` text NOT NULL,
	`label_id` text NOT NULL,
	PRIMARY KEY(`task_id`, `label_id`),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`project_id` text,
	`parent_id` text,
	`goal_id` text,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'backlog' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`assignee_agent_id` text,
	`assignee_user_id` text,
	`checkout_run_id` text,
	`execution_locked_at` integer,
	`task_number` integer,
	`identifier` text,
	`origin_kind` text DEFAULT 'manual' NOT NULL,
	`origin_id` text,
	`origin_run_id` text,
	`request_depth` integer DEFAULT 0 NOT NULL,
	`billing_code` text,
	`created_by_agent_id` text,
	`created_by_user_id` text,
	`started_at` integer,
	`completed_at` integer,
	`cancelled_at` integer,
	`hidden_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_identifier_unique` ON `tasks` (`identifier`);--> statement-breakpoint
CREATE INDEX `tasks_team_status_idx` ON `tasks` (`team_id`,`status`);--> statement-breakpoint
CREATE INDEX `tasks_assignee_idx` ON `tasks` (`team_id`,`assignee_agent_id`,`status`);--> statement-breakpoint
CREATE INDEX `tasks_parent_idx` ON `tasks` (`team_id`,`parent_id`);--> statement-breakpoint
CREATE INDEX `tasks_project_idx` ON `tasks` (`team_id`,`project_id`);--> statement-breakpoint
CREATE INDEX `tasks_origin_idx` ON `tasks` (`team_id`,`origin_kind`,`origin_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`task_prefix` text DEFAULT 'CCO' NOT NULL,
	`task_counter` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`run_id` text,
	`agent_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`started_at` integer,
	`finished_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`) REFERENCES `execution_workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workspace_runs_workspace_idx` ON `workspace_runs` (`workspace_id`);