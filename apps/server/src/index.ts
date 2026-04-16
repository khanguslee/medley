import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { HealthCheckSchema } from '@medley/shared';
import { db } from './db/client.js';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { loadStravaConfig } from './strava/config.js';
import stravaRoutes from './routes/strava.js';

// Fail fast if Strava env vars are missing
loadStravaConfig();

// Run migrations automatically on startup
migrate(db, { migrationsFolder: path.resolve(__dirname, '../drizzle') });

const app = new Hono();

app.get('/api/health', (c) => c.json(HealthCheckSchema.parse({ ok: true })));
app.route('/', stravaRoutes);

const port = 3421;
// Reference db to ensure the module initialises on server start.
void db;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`@medley/server listening on http://localhost:${info.port}`);
});
