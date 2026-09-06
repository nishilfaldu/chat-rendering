import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import Database from "better-sqlite3"

import { CACHE_REVISION, widthBucket } from "./index.ts"

test("migrates compatible cached geometry, rejects stale layouts, and accepts new writes", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "chat-cache-migration-"))
  const filename = path.join(directory, "test.sqlite")
  const previous = process.env.BENCH_SQLITE
  process.env.BENCH_SQLITE = filename
  const legacy = new Database(filename)
  legacy.exec(`
    CREATE TABLE messages (
      id TEXT PRIMARY KEY, session_id TEXT, role TEXT, timestamp INTEGER,
      kind TEXT, text TEXT, content_hash INTEGER, code_lang TEXT,
      image_width INTEGER, image_height INTEGER, height_class TEXT, sort_index INTEGER
    );
    INSERT INTO messages VALUES ('message', 'session', 'assistant', 0, 'short', 'Hello', 123, NULL, NULL, NULL, 'xs', 0);
    CREATE TABLE prerendered_html (message_id TEXT PRIMARY KEY, html TEXT NOT NULL, renderer_version TEXT NOT NULL);
    INSERT INTO prerendered_html VALUES ('message', '<p>Hello</p>', 'v2');
    CREATE TABLE bench_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT INTO bench_metadata VALUES ('dataset_version', 'v3');
    CREATE TABLE height_measurements (
      message_id TEXT, width_bucket INTEGER, content_hash INTEGER,
      dataset_version TEXT, renderer_version TEXT, layout_version TEXT,
      px REAL, measured_at INTEGER, source TEXT, settled INTEGER
    );
    INSERT INTO height_measurements VALUES ('message', 800, 123, 'v3', 'v2', 'v4', 100, 1, 'headless', 1);
    INSERT INTO height_measurements VALUES ('message', 768, 123, 'v3', 'v2', 'v3', 90, 1, 'headless', 1);
  `)
  legacy.close()
  const { getDb } = await import("./database.ts")
  const db = getDb()
  try {
    assert.equal(
      (
        db.prepare("SELECT COUNT(*) AS n FROM height_measurements").get() as {
          n: number
        }
      ).n,
      1
    )
    assert.deepEqual(
      db
        .prepare(
          "SELECT width_bucket, cache_revision, px FROM height_measurements"
        )
        .get(),
      { width_bucket: 800, cache_revision: "1", px: 100 }
    )
    assert.equal(
      (
        db.prepare("SELECT html FROM prerendered_html").get() as {
          html: string
        }
      ).html,
      "<p>Hello</p>"
    )
    const { upsertHeight, getPrerenderedHtml } = await import("./queries.ts")
    upsertHeight({
      messageId: "message",
      widthBucket: widthBucket(800),
      contentHash: 123,
      cacheRevision: CACHE_REVISION,
      px: 125,
      measuredAt: 2,
      source: "client",
      settled: true,
    })
    assert.equal(
      (
        db
          .prepare(
            "SELECT px FROM height_measurements WHERE cache_revision = ?"
          )
          .get(CACHE_REVISION) as { px: number }
      ).px,
      125
    )
    assert.equal(
      getPrerenderedHtml("message"),
      CACHE_REVISION === "1" ? "<p>Hello</p>" : null
    )
    assert.equal(
      (
        db
          .prepare(
            "SELECT value FROM bench_metadata WHERE key = 'cache_revision'"
          )
          .get() as { value: string }
      ).value,
      "1"
    )
  } finally {
    db.close()
    if (previous === undefined) delete process.env.BENCH_SQLITE
    else process.env.BENCH_SQLITE = previous
    rmSync(directory, { recursive: true, force: true })
  }
})
