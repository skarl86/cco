CREATE TABLE `work_products` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`task_id` text NOT NULL,
	`run_id` text,
	`workspace_id` text,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`external_id` text,
	`title` text NOT NULL,
	`url` text,
	`status` text DEFAULT 'active' NOT NULL,
	`review_state` text DEFAULT 'none' NOT NULL,
	`is_primary` integer DEFAULT 0 NOT NULL,
	`health_status` text DEFAULT 'unknown' NOT NULL,
	`summary` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `wp_task_idx` ON `work_products` (`team_id`,`task_id`,`type`);--> statement-breakpoint
CREATE INDEX `wp_provider_idx` ON `work_products` (`team_id`,`provider`,`external_id`);