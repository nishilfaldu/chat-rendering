import type Database from "better-sqlite3"

import { getDb } from "./database.ts"
import {
  DATASET_VERSION,
  LAYOUT_VERSION,
  RENDERER_VERSION,
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
       WHERE h.renderer_version = ?
         AND h.dataset_version = ?
         AND h.layout_version = ?
         AND h.settled = 1`
    )
    .get(RENDERER_VERSION, DATASET_VERSION, LAYOUT_VERSION) as { n: number }
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
        AND h.dataset_version = ?
        AND h.renderer_version = ?
        AND h.layout_version = ?
        AND h.settled = 1
        AND h.content_hash = m.content_hash
       WHERE m.session_id = ?
       ORDER BY m.sort_index ASC${boundedLimit === undefined ? "" : " LIMIT ?"}`
    )
    .all(
      input.widthBucket,
      DATASET_VERSION,
      RENDERER_VERSION,
      LAYOUT_VERSION,
      sessionId,
      ...(boundedLimit === undefined ? [] : [boundedLimit])
    ) as MessageIndexRow[]
}

export function getPrerenderedHtml(messageId: string): string | null {
  const row = getDb()
    .prepare(
      `SELECT html FROM prerendered_html WHERE message_id = ? AND renderer_version = ?`
    )
    .get(messageId, RENDERER_VERSION) as { html: string } | undefined
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
       WHERE renderer_version = ? AND message_id IN (${placeholders})`
    )
    .all(RENDERER_VERSION, ...messageIds) as Array<{ id: string; html: string }>
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
       WHERE m.session_id = ? AND p.renderer_version = ?`
    )
    .all(sessionId, RENDERER_VERSION) as Array<{ id: string; html: string }>
  return new Map(rows.map((row) => [row.id, row.html]))
}

function prepareHeightUpsert(database: Database.Database): Database.Statement {
  return database.prepare(
    `INSERT INTO height_measurements (
       message_id, width_bucket, content_hash, dataset_version, renderer_version, layout_version,
       px, measured_at, source, settled
     ) VALUES (
       @messageId, @widthBucket, @contentHash, @datasetVersion, @rendererVersion, @layoutVersion,
       @px, @measuredAt, @source, @settled
     )
     ON CONFLICT(message_id, width_bucket, content_hash, dataset_version, renderer_version, layout_version)
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
  prepareHeightUpsert(getDb()).run(persisted(measurement))
}

export function replaceHeights(rows: HeightMeasurement[]): void {
  const database = getDb()
  const upsert = prepareHeightUpsert(database)
  database.transaction((batch: HeightMeasurement[]) => {
    for (const row of batch) upsert.run(persisted(row))
  })(rows)
}

export function clearHeights(): void {
  getDb().exec("DELETE FROM height_measurements")
}
