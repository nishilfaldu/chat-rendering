import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { generateMessages } from "./generate.ts";
import { prerenderMessage } from "./prerender.ts";
import {
  MESSAGE_COUNT,
  RENDERER_VERSION,
  SESSION_ID,
  type HeightMeasurement,
  type MessageIndexRow,
  type SeedMessage,
  type WidthBucket,
} from "./types.ts";

function repoRoot(start = process.cwd()): string {
  let dir = start;
  while (true) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error("could not find pnpm-workspace.yaml");
    }
    dir = parent;
  }
}

export function sqlitePath(): string {
  const fromEnv = process.env.BENCH_SQLITE;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  return path.join(repoRoot(), "data", "bench.sqlite");
}

let dbSingleton: Database.Database | undefined;

export function getDb(): Database.Database {
  if (dbSingleton) {
    return dbSingleton;
  }
  const file = sqlitePath();
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      kind TEXT NOT NULL,
      text TEXT NOT NULL,
      code_lang TEXT,
      image_width INTEGER,
      image_height INTEGER,
      height_class TEXT NOT NULL,
      sort_index INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS messages_session_sort
      ON messages(session_id, sort_index);
    CREATE TABLE IF NOT EXISTS height_measurements (
      message_id TEXT NOT NULL,
      width_bucket INTEGER NOT NULL,
      px REAL NOT NULL,
      PRIMARY KEY (message_id, width_bucket)
    );
    CREATE TABLE IF NOT EXISTS prerendered_html (
      message_id TEXT PRIMARY KEY,
      html TEXT NOT NULL,
      renderer_version TEXT NOT NULL
    );
  `);
  dbSingleton = db;
  return db;
}

function rowToMessage(row: {
  id: string;
  session_id: string;
  role: SeedMessage["role"];
  timestamp: number;
  kind: SeedMessage["kind"];
  text: string;
  code_lang: string | null;
  image_width: number | null;
  image_height: number | null;
  height_class: SeedMessage["heightClass"];
  sort_index: number;
}): SeedMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    timestamp: row.timestamp,
    kind: row.kind,
    text: row.text,
    codeLang: row.code_lang ?? undefined,
    imageWidth: row.image_width ?? undefined,
    imageHeight: row.image_height ?? undefined,
    heightClass: row.height_class,
    sortIndex: row.sort_index,
  };
}

export function messageCount(): number {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM messages").get() as { n: number };
  return row.n;
}

export function listMessages(sessionId = SESSION_ID): SeedMessage[] {
  const rows = getDb()
    .prepare(
      `SELECT id, session_id, role, timestamp, kind, text, code_lang, image_width, image_height, height_class, sort_index
       FROM messages WHERE session_id = ? ORDER BY sort_index ASC`,
    )
    .all(sessionId) as Array<Parameters<typeof rowToMessage>[0]>;
  return rows.map(rowToMessage);
}

export function getMessage(id: string): SeedMessage | null {
  const row = getDb()
    .prepare(
      `SELECT id, session_id, role, timestamp, kind, text, code_lang, image_width, image_height, height_class, sort_index
       FROM messages WHERE id = ?`,
    )
    .get(id) as Parameters<typeof rowToMessage>[0] | undefined;
  return row ? rowToMessage(row) : null;
}

export function listIndex(input: {
  sessionId?: string;
  widthBucket: WidthBucket;
}): MessageIndexRow[] {
  const sessionId = input.sessionId ?? SESSION_ID;
  const rows = getDb()
    .prepare(
      `SELECT m.id AS id, m.timestamp AS timestamp, m.height_class AS heightClass, h.px AS measuredPx
       FROM messages m
       LEFT JOIN height_measurements h
         ON h.message_id = m.id AND h.width_bucket = ?
       WHERE m.session_id = ?
       ORDER BY m.sort_index ASC`,
    )
    .all(input.widthBucket, sessionId) as MessageIndexRow[];
  return rows;
}

export function getPrerenderedHtml(messageId: string): string | null {
  const row = getDb()
    .prepare(
      `SELECT html FROM prerendered_html WHERE message_id = ? AND renderer_version = ?`,
    )
    .get(messageId, RENDERER_VERSION) as { html: string } | undefined;
  return row?.html ?? null;
}

export function listPrerenderedHtml(sessionId = SESSION_ID): Map<string, string> {
  const rows = getDb()
    .prepare(
      `SELECT p.message_id AS id, p.html AS html
       FROM prerendered_html p
       JOIN messages m ON m.id = p.message_id
       WHERE m.session_id = ? AND p.renderer_version = ?`,
    )
    .all(sessionId, RENDERER_VERSION) as Array<{ id: string; html: string }>;
  return new Map(rows.map((row) => [row.id, row.html]));
}

export function upsertHeight(measurement: HeightMeasurement): void {
  getDb()
    .prepare(
      `INSERT INTO height_measurements (message_id, width_bucket, px)
       VALUES (@messageId, @widthBucket, @px)
       ON CONFLICT(message_id, width_bucket) DO UPDATE SET px = excluded.px`,
    )
    .run(measurement);
}

export function clearHeights(): void {
  getDb().exec("DELETE FROM height_measurements");
}

export async function seedDatabase(options?: { force?: boolean }): Promise<{ count: number; sqlite: string }> {
  const db = getDb();
  const existing = messageCount();
  if (existing === MESSAGE_COUNT && options?.force !== true) {
    return { count: existing, sqlite: sqlitePath() };
  }
  db.exec("DELETE FROM height_measurements");
  db.exec("DELETE FROM prerendered_html");
  db.exec("DELETE FROM messages");
  const messages = generateMessages();
  const insert = db.prepare(
    `INSERT INTO messages (
      id, session_id, role, timestamp, kind, text, code_lang, image_width, image_height, height_class, sort_index
    ) VALUES (
      @id, @sessionId, @role, @timestamp, @kind, @text, @codeLang, @imageWidth, @imageHeight, @heightClass, @sortIndex
    )`,
  );
  const insertHtml = db.prepare(
    `INSERT INTO prerendered_html (message_id, html, renderer_version) VALUES (?, ?, ?)`,
  );
  const writeAll = db.transaction(() => {
    for (const message of messages) {
      insert.run({
        id: message.id,
        sessionId: message.sessionId,
        role: message.role,
        timestamp: message.timestamp,
        kind: message.kind,
        text: message.text,
        codeLang: message.codeLang ?? null,
        imageWidth: message.imageWidth ?? null,
        imageHeight: message.imageHeight ?? null,
        heightClass: message.heightClass,
        sortIndex: message.sortIndex,
      });
    }
  });
  writeAll();
  const htmlTx = db.transaction((rows: Array<{ id: string; html: string }>) => {
    for (const row of rows) {
      insertHtml.run(row.id, row.html, RENDERER_VERSION);
    }
  });
  const htmlRows: Array<{ id: string; html: string }> = [];
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (!message) continue;
    htmlRows.push({ id: message.id, html: await prerenderMessage(message) });
    if (htmlRows.length === 100 || i === messages.length - 1) {
      htmlTx(htmlRows);
      htmlRows.length = 0;
      if ((i + 1) % 1000 === 0) {
        console.log(`prerendered ${i + 1}/${messages.length}`);
      }
    }
  }
  return { count: messageCount(), sqlite: sqlitePath() };
}
