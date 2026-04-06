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
CREATE UNIQUE INDEX `routine_triggers_public_id_unique` ON `routine_triggers` (`public_id`);