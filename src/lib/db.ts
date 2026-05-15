import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { ProviderId, Track } from '@/types';

type DB = ReturnType<typeof Database>;

let _db: DB | null = null;

function getDbPath(): string {
  const p = process.env.DATABASE_PATH || 'data/app.db';
  return resolve(process.cwd(), p);
}

function migrate(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      prompt      TEXT NOT NULL,
      code        TEXT NOT NULL,
      provider    TEXT NOT NULL,
      model       TEXT NOT NULL,
      created_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at DESC);
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

export const tracksRepo = {
  list(limit = 100): Track[] {
    const db = getDb();
    const rows = db
      .prepare('SELECT * FROM tracks ORDER BY created_at DESC LIMIT ?')
      .all(limit) as Track[];
    return rows;
  },
  get(id: string): Track | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id) as Track | undefined;
    return row ?? null;
  },
  create(input: {
    id: string;
    title: string;
    prompt: string;
    code: string;
    provider: ProviderId;
    model: string;
  }): Track {
    const db = getDb();
    const created_at = Date.now();
    db.prepare(
      'INSERT INTO tracks (id, title, prompt, code, provider, model, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(input.id, input.title, input.prompt, input.code, input.provider, input.model, created_at);
    return { ...input, created_at };
  },
  delete(id: string): boolean {
    const db = getDb();
    const info = db.prepare('DELETE FROM tracks WHERE id = ?').run(id);
    return info.changes > 0;
  },
};
