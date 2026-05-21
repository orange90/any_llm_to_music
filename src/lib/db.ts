import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

type DB = ReturnType<typeof Database>;

let _db: DB | null = null;

function getDbPath(): string {
  const p = process.env.DATABASE_PATH || 'data/app.db';
  return resolve(process.cwd(), p);
}

function migrate(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS default_llm_usage (
      day   TEXT PRIMARY KEY,
      count INTEGER NOT NULL
    );
  `);
}

export function getDb(): DB {
  if (_db) return _db;
  const path = getDbPath();
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  migrate(db);
  _db = db;
  return db;
}

function todayKey(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const defaultUsageRepo = {
  today(): { day: string; count: number } {
    const db = getDb();
    const day = todayKey();
    const row = db
      .prepare('SELECT day, count FROM default_llm_usage WHERE day = ?')
      .get(day) as { day: string; count: number } | undefined;
    return row ?? { day, count: 0 };
  },
  increment(): { day: string; count: number } {
    const db = getDb();
    const day = todayKey();
    db.prepare(
      `INSERT INTO default_llm_usage (day, count) VALUES (?, 1)
       ON CONFLICT(day) DO UPDATE SET count = count + 1`,
    ).run(day);
    return this.today();
  },
};
