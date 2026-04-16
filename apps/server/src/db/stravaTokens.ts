import { eq } from 'drizzle-orm';
import { db } from './client.js';
import { stravaTokens, type StravaTokenInput, type StravaTokenRow } from './schema.js';

export function getStravaToken(): StravaTokenRow | null {
  return db.select().from(stravaTokens).where(eq(stravaTokens.id, 1)).get() ?? null;
}

export function saveStravaToken(input: StravaTokenInput): void {
  db.insert(stravaTokens)
    .values({ ...input, id: 1, updated_at: Date.now() })
    .onConflictDoUpdate({
      target: stravaTokens.id,
      set: { ...input, updated_at: Date.now() },
    })
    .run();
}

export function clearStravaToken(): void {
  db.delete(stravaTokens).where(eq(stravaTokens.id, 1)).run();
}
