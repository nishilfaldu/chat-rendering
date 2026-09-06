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
      cache_revision TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bench_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
  migrateMessages(database)
  migrateRenderingCache(database)
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
    names.has("cache_revision") &&
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

// Migrate the old three-version format without discarding compatible seed heights.
function migrateRenderingCache(database: Database.Database): void {
  const htmlColumns = database
    .prepare("PRAGMA table_info(prerendered_html)")
    .all() as Array<{ name: string }>
  if (!htmlColumns.some((column) => column.name === "renderer_version")) return
  database.transaction(() => {
    database.exec(`
      ALTER TABLE prerendered_html RENAME TO old_prerendered_html;
      CREATE TABLE prerendered_html (
        message_id TEXT PRIMARY KEY, html TEXT NOT NULL, cache_revision TEXT NOT NULL
      );
    `)
    database
      .prepare(
        `INSERT INTO prerendered_html SELECT message_id, html, ? FROM old_prerendered_html WHERE renderer_version = 'v2'`
      )
      .run("1")
    database.exec("DROP TABLE old_prerendered_html")
    const columns = database
      .prepare("PRAGMA table_info(height_measurements)")
      .all() as Array<{ name: string }>
    const legacy = [
      "dataset_version",
      "renderer_version",
      "layout_version",
      "content_hash",
      "source",
      "settled",
      "measured_at",
    ].every((name) => columns.some((column) => column.name === name))
    if (legacy) {
      database.exec(
        "ALTER TABLE height_measurements RENAME TO old_height_measurements; DROP INDEX IF EXISTS heights_current_lookup"
      )
      migrateHeightMeasurements(database)
      database
        .prepare(
          `INSERT INTO height_measurements
        (message_id, width_bucket, content_hash, cache_revision, px, measured_at, source, settled)
        SELECT message_id, width_bucket, content_hash, ?, px, measured_at, source, settled
        FROM old_height_measurements WHERE dataset_version = 'v3' AND renderer_version = 'v2' AND layout_version = 'v4'`
        )
        .run("1")
      database.exec("DROP TABLE old_height_measurements")
    }
    const previous = database
      .prepare("SELECT value FROM bench_metadata WHERE key = 'dataset_version'")
      .get() as { value: string } | undefined
    if (previous?.value === "v3") {
      database
        .prepare(
          "INSERT OR REPLACE INTO bench_metadata (key, value) VALUES ('cache_revision', ?)"
        )
        .run("1")
    }
    database.exec("DELETE FROM bench_metadata WHERE key = 'dataset_version'")
  })()
}
