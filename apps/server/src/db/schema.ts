import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const stravaTokens = sqliteTable('strava_tokens', {
  id: integer('id').primaryKey(),
  access_token: text('access_token').notNull(),
  refresh_token: text('refresh_token').notNull(),
  expires_at: integer('expires_at').notNull(),
  athlete_id: integer('athlete_id'),
  athlete_firstname: text('athlete_firstname'),
  athlete_lastname: text('athlete_lastname'),
  updated_at: integer('updated_at').notNull(),
});

export type StravaTokenRow = typeof stravaTokens.$inferSelect;
export type StravaTokenInput = Omit<StravaTokenRow, 'id' | 'updated_at'>;
