import { existsSync, mkdirSync, unlinkSync } from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"
import { workspaceRoot } from "../lib/seed/workspace.ts"
import { generateMessages } from "../lib/seed/generate.ts"
import { hashContent } from "../lib/seed/markdown.ts"
import { prerenderMessage } from "../lib/seed/prerender.ts"
import { CACHE_REVISION, MESSAGE_COUNT } from "../lib/seed/types.ts"

const file = path.join(workspaceRoot(), "data", "bench.sqlite")
mkdirSync(path.dirname(file), { recursive: true })
for (const leftover of [file, `${file}-wal`, `${file}-shm`]) {
  if (existsSync(leftover)) unlinkSync(leftover)
}

const database = new DatabaseSync(file)
database.exec(`
  PRAGMA journal_mode = DELETE;
  PRAGMA foreign_keys = ON;
  CREATE TABLE messages (
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
  CREATE INDEX messages_session_sort ON messages(session_id, sort_index);
  CREATE TABLE prerendered_html (
    message_id TEXT PRIMARY KEY,
    html TEXT NOT NULL,
    cache_revision TEXT NOT NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
  );
  CREATE TABLE bench_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE height_measurements (
    message_id TEXT NOT NULL,
    width_bucket INTEGER NOT NULL,
    content_hash INTEGER NOT NULL,
    cache_revision TEXT NOT NULL,
    px REAL NOT NULL,
    measured_at INTEGER NOT NULL,
    source TEXT NOT NULL,
    settled INTEGER NOT NULL,
    PRIMARY KEY (message_id, width_bucket, content_hash, cache_revision),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
  );
  CREATE INDEX heights_current_lookup
    ON height_measurements(width_bucket, cache_revision, settled);
`)

const messages = generateMessages()
if (messages.length !== MESSAGE_COUNT) {
  throw new Error(`expected ${MESSAGE_COUNT} messages, got ${messages.length}`)
}

const insertMessage = database.prepare(`
  INSERT INTO messages (
    id, session_id, role, timestamp, kind, text, content_hash, code_lang,
    image_width, image_height, height_class, sort_index
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
`)
database.exec("BEGIN")
for (const message of messages) {
  insertMessage.run(
    message.id,
    message.sessionId,
    message.role,
    message.timestamp,
    message.kind,
    message.text,
    hashContent(message.text),
    message.codeLang ?? null,
    message.imageWidth ?? null,
    message.imageHeight ?? null,
    message.heightClass,
    message.sortIndex
  )
}
database.exec("COMMIT")

const insertHtml = database.prepare(
  `INSERT INTO prerendered_html (message_id, html, cache_revision) VALUES (?, ?, ?)`
)
const htmlRows: Array<{ id: string; html: string }> = []
const flushHtml = () => {
  if (htmlRows.length === 0) return
  database.exec("BEGIN")
  for (const row of htmlRows) insertHtml.run(row.id, row.html, CACHE_REVISION)
  database.exec("COMMIT")
  htmlRows.length = 0
}
for (let index = 0; index < messages.length; index += 1) {
  const message = messages[index]
  if (!message) continue
  htmlRows.push({ id: message.id, html: await prerenderMessage(message) })
  if (htmlRows.length === 100 || index === messages.length - 1) {
    flushHtml()
    if ((index + 1) % 1_000 === 0) {
      console.log(`prerendered ${index + 1}/${messages.length}`)
    }
  }
}

database
  .prepare(
    `INSERT INTO bench_metadata (key, value) VALUES ('cache_revision', ?)`
  )
  .run(CACHE_REVISION)
database.exec("VACUUM")
database.close()
console.log(`seeded ${messages.length} messages at ${file}`)
