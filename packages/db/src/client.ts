import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema/index.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export interface Database {
  readonly db: ReturnType<typeof drizzle<typeof schema>>;
  close(): void;
}

function getMigrationsFolder(): string {
  const thisDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(thisDir, '..', 'drizzle');
}

/**
 * If a DB was created before the migration system (raw CREATE TABLE),
 * populate the migration journal so Drizzle skips already-applied migrations.
 *
 * Drizzle uses SHA-256 of the SQL file content as the hash.
 */
function seedJournalForLegacyDb(sqlite: BetterSqlite3.Database): void {
  // Check if legacy DB: has tables + has empty journal
  const hasTeams = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='teams'")
    .get();
  if (!hasTeams) return; // Fresh DB — nothing to do

  const journalRow = sqlite
    .prepare("SELECT COUNT(*) as cnt FROM __drizzle_migrations")
    .get() as { cnt: number } | undefined;

  // If journal already has entries, skip
  if (journalRow && journalRow.cnt > 0) return;

  // Legacy DB with empty journal — seed it
  const migrationsFolder = getMigrationsFolder();
  const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');

  let journal: { entries: Array<{ tag: string }> };
  try {
    journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));
  } catch {
    return;
  }

  for (const entry of journal.entries) {
    const sqlFile = path.join(migrationsFolder, `${entry.tag}.sql`);
    try {
      const sqlContent = fs.readFileSync(sqlFile, 'utf-8');

      // Check if this migration creates a table that already exists
      const tableMatches = sqlContent.matchAll(/CREATE TABLE `(\w+)`/g);
      let alreadyApplied = false;
      for (const match of tableMatches) {
        const exists = sqlite
          .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
          .get(match[1]);
        if (exists) {
          alreadyApplied = true;
          break;
        }
      }

      if (alreadyApplied) {
        // Drizzle hashes the SQL content with SHA-256
        const hash = createHash('sha256').update(sqlContent).digest('hex');
        sqlite
          .prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)')
          .run(hash, Date.now());
      }
    } catch {
      // Migration file missing — skip
    }
  }
}

export function createDatabase(dbPath: string): Database {
  const sqlite = new BetterSqlite3(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Ensure migration journal table exists (Drizzle creates it, but legacy DBs may need it)
  sqlite.prepare(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at numeric
    )
  `).run();

  // Handle legacy DBs that predate the migration system
  seedJournalForLegacyDb(sqlite);

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: getMigrationsFolder() });

  return {
    db,
    close() {
      sqlite.close();
    },
  };
}
