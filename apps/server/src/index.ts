import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { db } from './db/client.js';
import { HealthCheckSchema } from '@medley/shared';

const app = new Hono();

app.get('/api/health', (c) => c.json(HealthCheckSchema.parse({ ok: true })));

const port = 3421;
// Reference db here to ensure the module initialises (creates ~/.medley dir +
// opens the connection) on server start rather than on first query.
void db;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`@medley/server listening on http://localhost:${info.port}`);
});
