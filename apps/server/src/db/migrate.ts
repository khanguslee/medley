import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, '../../drizzle');

migrate(db, { migrationsFolder });
console.log('Migrations applied.');
