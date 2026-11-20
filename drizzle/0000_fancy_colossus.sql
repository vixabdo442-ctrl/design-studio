CREATE TABLE `brand_kits` (
	`org_id` text PRIMARY KEY NOT NULL,
	`colors` text DEFAULT '[]' NOT NULL,
	`heading_font` text,
	`subheading_font` text,
	`body_font` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `brand_logos` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`content_type` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `brand_logos_org` ON `brand_logos` (`org_id`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`design_id` text NOT NULL,
	`author_id` text NOT NULL,
	`author_email` text NOT NULL,
	`parent_id` text,
	`page_index` integer,
	`body` text NOT NULL,
	`resolved` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `comments_design` ON `comments` (`design_id`);--> statement-breakpoint
CREATE TABLE `design_shares` (
	`design_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	PRIMARY KEY(`design_id`, `email`)
);
--> statement-breakpoint
CREATE INDEX `design_shares_email` ON `design_shares` (`email`);--> statement-breakpoint
CREATE TABLE `designs` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`folder_id` text,
	`name` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`doc` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`link_access` text DEFAULT 'none' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `designs_owner` ON `designs` (`org_id`,`owner_id`);--> statement-breakpoint
CREATE TABLE `folders` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `folders_owner` ON `folders` (`org_id`,`owner_id`);--> statement-breakpoint
CREATE TABLE `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`creator_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`doc` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `templates_org` ON `templates` (`org_id`);--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`folder_id` text,
	`name` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `uploads_owner` ON `uploads` (`org_id`,`owner_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
