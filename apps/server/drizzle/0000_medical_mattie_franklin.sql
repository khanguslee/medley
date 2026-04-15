CREATE TABLE `strava_tokens` (
	`id` integer PRIMARY KEY NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`athlete_id` integer,
	`athlete_firstname` text,
	`athlete_lastname` text,
	`updated_at` integer NOT NULL
);
