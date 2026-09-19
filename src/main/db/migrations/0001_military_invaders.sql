PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_invoice` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`enrollment_id` integer,
	`session_id` integer,
	`amount` real NOT NULL,
	`issue_date` text NOT NULL,
	`due_date` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`paid_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`course_enrollment_id` integer,
	`cycle_number` integer NOT NULL,
	`cycle_start_date` text NOT NULL,
	`cycle_end_date` text NOT NULL,
	`is_prorated` integer DEFAULT false NOT NULL,
	`original_monthly_price` real NOT NULL,
	`credit_applied` real DEFAULT 0 NOT NULL,
	`session_count` integer NOT NULL,
	`attended_count` integer,
	`notes` text,
	FOREIGN KEY (`enrollment_id`) REFERENCES `enrollment`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`course_enrollment_id`) REFERENCES `course_enrollment`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_invoice`("id", "enrollment_id", "session_id", "amount", "issue_date", "due_date", "status", "paid_at", "created_at", "course_enrollment_id", "cycle_number", "cycle_start_date", "cycle_end_date", "is_prorated", "original_monthly_price", "credit_applied", "session_count", "attended_count", "notes") SELECT "id", "enrollment_id", "session_id", "amount", "issue_date", "due_date", "status", "paid_at", "created_at", "course_enrollment_id", "cycle_number", "cycle_start_date", "cycle_end_date", "is_prorated", "original_monthly_price", "credit_applied", "session_count", "attended_count", "notes" FROM `invoice`;--> statement-breakpoint
DROP TABLE `invoice`;--> statement-breakpoint
ALTER TABLE `__new_invoice` RENAME TO `invoice`;--> statement-breakpoint
PRAGMA foreign_keys=ON;