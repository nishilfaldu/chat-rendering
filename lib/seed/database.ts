import { mkdirSync } from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"

import { hashContent } from "./markdown.ts"
import { workspaceRoot } from "./workspace.ts"

export function sqlitePath(): string {
  const configured = process.env.BENCH_SQLITE
  return configured && configured.length > 0
    ? configured
    : path.join(workspaceRoot(), "data", "bench.sqlite")
}

let databaseSingleton: Database.Database | undefined

export function getDb(): Database.Database {
  if (databaseSingleton) return databaseSingleton
  const file = sqlitePath()
  mkdirSync(path.dirname(file), { recursive: true })
  const database = new Database(file)
  database.pragma("journal_mode = WAL")
  database.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      kind TEXT NOT NULL,
      text TEXT NOT NULL,
      content_hash INTEGER NOT NULL DEFAULT 0,
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
      renderer_version TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bench_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
  migrateMessages(database)
  migrateHeightMeasurements(database)
  databaseSingleton = database
  return database
}

function migrateMessages(database: Database.Database): void {
  const columns = database
    .prepare("PRAGMA table_info(messages)")
    .all() as Array<{
    name: string
  }>
  if (columns.some((column) => column.name === "content_hash")) return
  database.exec(
    "ALTER TABLE messages ADD COLUMN content_hash INTEGER NOT NULL DEFAULT 0"
  )
  const rows = database
    .prepare("SELECT id, text FROM messages")
    .all() as Array<{
    id: string
    text: string
  }>
  const update = database.prepare(
    "UPDATE messages SET content_hash = ? WHERE id = ?"
  )
  database.transaction(() => {
    for (const row of rows) update.run(hashContent(row.text), row.id)
  })()
}

function migrateHeightMeasurements(database: Database.Database): void {
  const columns = database
    .prepare("PRAGMA table_info(height_measurements)")
    .all() as Array<{ name: string }>
  const names = new Set(columns.map((column) => column.name))
  const current =
    names.has("content_hash") &&
    names.has("dataset_version") &&
    names.has("renderer_version") &&
    names.has("layout_version") &&
    names.has("measured_at") &&
    names.has("source") &&
    names.has("settled")
  if (columns.length > 0 && !current) {
    database.exec("DROP TABLE height_measurements")
  }
  database.exec(`
    CREATE TABLE IF NOT EXISTS height_measurements (
      message_id TEXT NOT NULL,
      width_bucket INTEGER NOT NULL,
      content_hash INTEGER NOT NULL,
      dataset_version TEXT NOT NULL,
      renderer_version TEXT NOT NULL,
      layout_version TEXT NOT NULL,
      px REAL NOT NULL,
      measured_at INTEGER NOT NULL,
      source TEXT NOT NULL,
      settled INTEGER NOT NULL,
      PRIMARY KEY (
        message_id,
        width_bucket,
        content_hash,
        dataset_version,
        renderer_version,
        layout_version
      ),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS heights_current_lookup
      ON height_measurements(width_bucket, dataset_version, renderer_version, layout_version, settled);
  `)
}
