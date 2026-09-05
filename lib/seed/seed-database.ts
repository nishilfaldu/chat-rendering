import { getDb, sqlitePath } from "./database.ts"
import { generateMessages } from "./generate.ts"
import { hashContent } from "./markdown.ts"
import { prerenderMessage } from "./prerender.ts"
import { messageCount } from "./queries.ts"
import { DATASET_VERSION, MESSAGE_COUNT, RENDERER_VERSION } from "./types.ts"

export async function seedDatabase(options?: {
  force?: boolean
}): Promise<{ count: number; sqlite: string }> {
  const database = getDb()
  const existing = messageCount()
  const metadata = database
    .prepare("SELECT value FROM bench_metadata WHERE key = 'dataset_version'")
    .get() as { value: string } | undefined
  if (
    existing === MESSAGE_COUNT &&
    metadata?.value === DATASET_VERSION &&
    options?.force !== true
  ) {
    return { count: existing, sqlite: sqlitePath() }
  }

  database.exec("DELETE FROM height_measurements")
  database.exec("DELETE FROM prerendered_html")
  database.exec("DELETE FROM messages")
  const messages = generateMessages()
  const insertMessage = database.prepare(
    `INSERT INTO messages (
      id, session_id, role, timestamp, kind, text, content_hash, code_lang, image_width, image_height, height_class, sort_index
    ) VALUES (
      @id, @sessionId, @role, @timestamp, @kind, @text, @contentHash, @codeLang, @imageWidth, @imageHeight, @heightClass, @sortIndex
    )`
  )
  database.transaction(() => {
    for (const message of messages) {
      insertMessage.run({
        ...message,
        contentHash: hashContent(message.text),
        codeLang: message.codeLang ?? null,
        imageWidth: message.imageWidth ?? null,
        imageHeight: message.imageHeight ?? null,
      })
    }
  })()

  const insertHtml = database.prepare(
    `INSERT INTO prerendered_html (message_id, html, renderer_version) VALUES (?, ?, ?)`
  )
  const writeHtml = database.transaction(
    (rows: Array<{ id: string; html: string }>) => {
      for (const row of rows) {
        insertHtml.run(row.id, row.html, RENDERER_VERSION)
      }
    }
  )
  const htmlRows: Array<{ id: string; html: string }> = []
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]
    if (!message) continue
    htmlRows.push({ id: message.id, html: await prerenderMessage(message) })
    if (htmlRows.length === 100 || index === messages.length - 1) {
      writeHtml(htmlRows)
      htmlRows.length = 0
      if ((index + 1) % 1_000 === 0) {
        console.log(`prerendered ${index + 1}/${messages.length}`)
      }
    }
  }
  database
    .prepare(
      `INSERT INTO bench_metadata (key, value) VALUES ('dataset_version', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(DATASET_VERSION)
  return { count: messageCount(), sqlite: sqlitePath() }
}
