import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

app.get('/api/health', (c) => c.json({ ok: true }));

const port = 3421;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`@medley/server listening on http://localhost:${info.port}`);
});
