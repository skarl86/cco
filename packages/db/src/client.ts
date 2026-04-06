import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Database {
  readonly db: ReturnType<typeof drizzle<typeof schema>>;
  close(): void;
}

function getMigrationsFolder(): string {
  // Resolve relative to this file's location → packages/db/drizzle/
  const thisDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(thisDir, '..', 'drizzle');
}

export function createDatabase(dbPath: string): Database {
  const sqlite = new BetterSqlite3(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });

  // Apply pending migrations
  migrate(db, { migrationsFolder: getMigrationsFolder() });

  return {
    db,
    close() {
      sqlite.close();
    },
  };
}
