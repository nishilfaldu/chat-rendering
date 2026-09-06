import type Database from "better-sqlite3"

import { getDb } from "./database.ts"
import {
  CACHE_REVISION,
  SESSION_ID,
  WIDTH_BUCKETS,
  type HeightMeasurement,
  type MessageIndexRow,
  type SeedMessage,
  type WidthBucket,
} from "./types.ts"

function rowToMessage(row: {
  id: string
  session_id: string
  role: SeedMessage["role"]
  timestamp: number
  kind: SeedMessage["kind"]
  text: string
  code_lang: string | null
  image_width: number | null
  image_height: number | null
  height_class: SeedMessage["heightClass"]
  sort_index: number
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
  }
}

export function messageCount(): number {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM messages").get() as {
    n: number
  }
  return row.n
}

export function heightMeasurementCount(): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS n
       FROM height_measurements h
       JOIN messages m ON m.id = h.message_id AND m.content_hash = h.content_hash
       WHERE h.cache_revision = ?
         AND h.settled = 1`
    )
    .get(CACHE_REVISION) as { n: number }
  return row.n
}

export function expectedHeightCount(): number {
  return messageCount() * WIDTH_BUCKETS.length
}

export function measurementsAreWarm(): boolean {
  return heightMeasurementCount() === expectedHeightCount()
}

export function listMessages(
  sessionId = SESSION_ID,
  limit?: number
): SeedMessage[] {
  const boundedLimit =
    limit === undefined ? undefined : Math.max(1, Math.floor(limit))
  const sql = `SELECT id, session_id, role, timestamp, kind, text, code_lang, image_width, image_height, height_class, sort_index
       FROM messages WHERE session_id = ? ORDER BY sort_index ASC${
         boundedLimit === undefined ? "" : " LIMIT ?"
       }`
  const rows = getDb()
    .prepare(sql)
    .all(
      ...(boundedLimit === undefined ? [sessionId] : [sessionId, boundedLimit])
    ) as Array<Parameters<typeof rowToMessage>[0]>
  return rows.map(rowToMessage)
}

export function getMessage(id: string): SeedMessage | null {
  const row = getDb()
    .prepare(
      `SELECT id, session_id, role, timestamp, kind, text, code_lang, image_width, image_height, height_class, sort_index
       FROM messages WHERE id = ?`
    )
    .get(id) as Parameters<typeof rowToMessage>[0] | undefined
  return row ? rowToMessage(row) : null
}

export function listIndex(input: {
  sessionId?: string
  widthBucket: WidthBucket
  limit?: number
}): MessageIndexRow[] {
  const sessionId = input.sessionId ?? SESSION_ID
  const boundedLimit =
    input.limit === undefined ? undefined : Math.max(1, Math.floor(input.limit))
  return getDb()
    .prepare(
      `SELECT m.id AS id,
              m.timestamp AS timestamp,
              m.height_class AS heightClass,
              h.px AS measuredPx
       FROM messages m
       LEFT JOIN height_measurements h
         ON h.message_id = m.id
        AND h.width_bucket = ?
        AND h.cache_revision = ?
        AND h.settled = 1
        AND h.content_hash = m.content_hash
       WHERE m.session_id = ?
       ORDER BY m.sort_index ASC${boundedLimit === undefined ? "" : " LIMIT ?"}`
    )
    .all(
      input.widthBucket,
      CACHE_REVISION,
      sessionId,
      ...(boundedLimit === undefined ? [] : [boundedLimit])
    ) as MessageIndexRow[]
}

export function getPrerenderedHtml(messageId: string): string | null {
  const row = getDb()
    .prepare(
      `SELECT html FROM prerendered_html WHERE message_id = ? AND cache_revision = ?`
    )
    .get(messageId, CACHE_REVISION) as { html: string } | undefined
  return row?.html ?? null
}

export function getPrerenderedHtmlBatch(
  messageIds: string[]
): Map<string, string> {
  if (messageIds.length === 0) return new Map()
  const placeholders = messageIds.map(() => "?").join(",")
  const rows = getDb()
    .prepare(
      `SELECT message_id AS id, html
       FROM prerendered_html
       WHERE cache_revision = ? AND message_id IN (${placeholders})`
    )
    .all(CACHE_REVISION, ...messageIds) as Array<{ id: string; html: string }>
  return new Map(rows.map((row) => [row.id, row.html]))
}

export function listPrerenderedHtml(
  sessionId = SESSION_ID
): Map<string, string> {
  const rows = getDb()
    .prepare(
      `SELECT p.message_id AS id, p.html AS html
       FROM prerendered_html p
       JOIN messages m ON m.id = p.message_id
       WHERE m.session_id = ? AND p.cache_revision = ?`
    )
    .all(sessionId, CACHE_REVISION) as Array<{ id: string; html: string }>
  return new Map(rows.map((row) => [row.id, row.html]))
}

function prepareHeightUpsert(database: Database.Database): Database.Statement {
  return database.prepare(
    `INSERT INTO height_measurements (
       message_id, width_bucket, content_hash, cache_revision,
       px, measured_at, source, settled
     ) VALUES (
       @messageId, @widthBucket, @contentHash, @cacheRevision,
       @px, @measuredAt, @source, @settled
     )
     ON CONFLICT(message_id, width_bucket, content_hash, cache_revision)
     DO UPDATE SET
       px = excluded.px,
       measured_at = excluded.measured_at,
       source = excluded.source,
       settled = excluded.settled`
  )
}

function persisted(measurement: HeightMeasurement) {
  return { ...measurement, settled: measurement.settled ? 1 : 0 }
}

export function upsertHeight(measurement: HeightMeasurement): void {
  const database = getDb()
  if (database.readonly) return
  prepareHeightUpsert(database).run(persisted(measurement))
}

export function replaceHeights(rows: HeightMeasurement[]): void {
  const database = getDb()
  if (database.readonly) return
  const upsert = prepareHeightUpsert(database)
  database.transaction((batch: HeightMeasurement[]) => {
    for (const row of batch) upsert.run(persisted(row))
  })(rows)
}

export function clearHeights(): void {
  const database = getDb()
  if (database.readonly) return
  database.exec("DELETE FROM height_measurements")
}
