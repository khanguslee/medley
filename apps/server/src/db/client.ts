import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as schema from './schema.js';

const dbPath =
  process.env.MEDLEY_DB_PATH ??
  path.join(os.homedir(), '.medley', 'data.db');

mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });
