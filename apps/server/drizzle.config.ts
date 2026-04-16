import os from 'node:os';
import path from 'node:path';
import { defineConfig } from 'drizzle-kit';

const dbPath =
  process.env.MEDLEY_DB_PATH ??
  path.join(os.homedir(), '.medley', 'data.db');

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: dbPath },
});
