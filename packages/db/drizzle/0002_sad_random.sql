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