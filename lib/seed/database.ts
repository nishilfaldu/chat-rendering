import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"
import Database from "better-sqlite3"

import { workspaceRoot } from "./workspace.ts"

export function sqlitePath(): string {
  const configured = process.env.BENCH_SQLITE
  return configured && configured.length > 0
    ? configured
    : path.join(workspaceRoot(), "data", "bench.sqlite")
}

export function sqliteArchivePath(file = sqlitePath()): string {
  return `${file}.gz`
}

export function sqliteReadonly(): boolean {
  return Boolean(process.env.VERCEL) && !process.env.BENCH_SQLITE
}

export function unpackSqlite(file = sqlitePath()): void {
  if (existsSync(file)) return
  const archive = sqliteArchivePath(file)
  if (!existsSync(archive)) return
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, gunzipSync(readFileSync(archive)))
}

let databaseSingleton: Database.Database | undefined

export function getDb(): Database.Database {
  if (databaseSingleton) return databaseSingleton
  const file = sqlitePath()
  unpackSqlite(file)
  const readonly = sqliteReadonly()
  if (!readonly) mkdirSync(path.dirname(file), { recursive: true })
  const database = new Database(file, {
    readonly,
    fileMustExist: readonly,
  })
  if (!readonly) {
    database.pragma("journal_mode = WAL")
    database.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        kind TEXT NOT NULL,
        text TEXT NOT NULL,
        content_hash INTEGER NOT NULL,
        code_lang TEXT,
        image_width INTEGER,
        image_height INTEGER,
        height_class TEXT NOT NULL,
        sort_index INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS messages_session_sort
        ON messages(session_id, sort_index);
      CREATE TABLE IF NOT EXISTS prerendered_html (
        message_id TEXT PRIMARY KEY,
        html TEXT NOT NULL,
        cache_revision TEXT NOT NULL,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS bench_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS height_measurements (
        message_id TEXT NOT NULL,
        width_bucket INTEGER NOT NULL,
        content_hash INTEGER NOT NULL,
        cache_revision TEXT NOT NULL,
        px REAL NOT NULL,
        measured_at INTEGER NOT NULL,
        source TEXT NOT NULL,
        settled INTEGER NOT NULL,
        PRIMARY KEY (
          message_id,
          width_bucket,
          content_hash,
          cache_revision
        ),
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS heights_current_lookup
        ON height_measurements(width_bucket, cache_revision, settled);
    `)
  }
  databaseSingleton = database
  return database
}
