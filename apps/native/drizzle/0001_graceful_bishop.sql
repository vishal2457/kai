CREATE TABLE `budget` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`amount` real NOT NULL,
	`period` text NOT NULL,
	`user_id` text
);
--> statement-breakpoint
CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`user_id` text
);
--> statement-breakpoint
CREATE TABLE `transaction` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` real NOT NULL,
	`date` integer NOT NULL,
	`description` text,
	`item` text,
	`category_id` text NOT NULL,
	`type` text NOT NULL,
	`user_id` text
);
