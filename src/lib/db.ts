import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Track } from '@/types';

type DB = ReturnType<typeof Database>;

let _db: DB | null = null;

function getDbPath(): string {
  const p = process.env.DATABASE_PATH || 'data/app.db';
  return resolve(process.cwd(), p);
}

function migrate(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id            TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      prompt        TEXT NOT NULL,
      code          TEXT NOT NULL,
      endpoint_name TEXT NOT NULL,
      model         TEXT NOT NULL,
      created_at    INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at DESC);

    CREATE TABLE IF NOT EXISTS default_llm_usage (
      day   TEXT PRIMARY KEY,
      count INTEGER NOT NULL
    );
  `);

  const cols = db.prepare(`PRAGMA table_info(tracks)`).all() as Array<{
    name: string;
    notnull: number;
    dflt_value: string | null;
  }>;
  const colNames = cols.map((c) => c.name);
  if (!colNames.includes('endpoint_name')) {
    if (colNames.includes('provider')) {
      db.exec(`ALTER TABLE tracks ADD COLUMN endpoint_name TEXT NOT NULL DEFAULT ''`);
      db.exec(`UPDATE tracks SET endpoint_name = provider WHERE endpoint_name = ''`);
    } else {
      db.exec(`ALTER TABLE tracks ADD COLUMN endpoint_name TEXT NOT NULL DEFAULT ''`);
    }
  }

  const providerCol = cols.find((c) => c.name === 'provider');
  if (providerCol && providerCol.notnull === 1 && providerCol.dflt_value === null) {
    db.exec('BEGIN');
    try {
      db.exec(`
        CREATE TABLE tracks_new (
          id            TEXT PRIMARY KEY,
          title         TEXT NOT NULL,
          prompt        TEXT NOT NULL,
          code          TEXT NOT NULL,
          endpoint_name TEXT NOT NULL,
          model         TEXT NOT NULL,
          created_at    INTEGER NOT NULL
        );
      `);
      db.exec(`
        INSERT INTO tracks_new (id, title, prompt, code, endpoint_name, model, created_at)
        SELECT id, title, prompt, code, endpoint_name, model, created_at FROM tracks;
      `);
      db.exec(`DROP TABLE tracks;`);
      db.exec(`ALTER TABLE tracks_new RENAME TO tracks;`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at DESC);`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
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

export const tracksRepo = {
  list(limit = 100): Track[] {
    const db = getDb();
    const rows = db
      .prepare('SELECT id, title, prompt, code, endpoint_name, model, created_at FROM tracks ORDER BY created_at DESC LIMIT ?')
      .all(limit) as Track[];
    return rows;
  },
  get(id: string): Track | null {
    const db = getDb();
    const row = db
      .prepare('SELECT id, title, prompt, code, endpoint_name, model, created_at FROM tracks WHERE id = ?')
      .get(id) as Track | undefined;
    return row ?? null;
  },
  create(input: {
    id: string;
    title: string;
    prompt: string;
    code: string;
    endpoint_name: string;
    model: string;
  }): Track {
    const db = getDb();
    const created_at = Date.now();
    db.prepare(
      'INSERT INTO tracks (id, title, prompt, code, endpoint_name, model, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(input.id, input.title, input.prompt, input.code, input.endpoint_name, input.model, created_at);
    return { ...input, created_at };
  },
  delete(id: string): boolean {
    const db = getDb();
    const info = db.prepare('DELETE FROM tracks WHERE id = ?').run(id);
    return info.changes > 0;
  },
};

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
