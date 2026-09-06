import { CACHE_REVISION, type WidthBucket } from "@/lib/seed"

const DB_NAME = "railgun-saved-in-browser"
// One cache generation; upgrading drops only derived heights and HTML.
const DB_VERSION = 2 + Number(CACHE_REVISION)
const HEIGHT_STORE = "heights"
const HTML_STORE = "html"
const HTML_MEMORY_LIMIT = 2_000

export type BrowserCacheHeightRow = {
  key: string
  sessionId: string
  messageId: string
  widthBucket: WidthBucket
  contentHash: number
  height: number
  settledAt: number
}

type BrowserCacheHtmlRow = {
  key: string
  widthBucket: WidthBucket
  contentHash: number
  html: string
  settledAt: number
}

export function browserCacheKey(input: {
  sessionId: string
  messageId: string
  widthBucket: WidthBucket
  contentHash: number
}): string {
  return [
    input.sessionId,
    input.messageId,
    input.widthBucket,
    input.contentHash,
  ].join(":")
}

function htmlCacheKey(contentHash: number, widthBucket: WidthBucket): string {
  return [contentHash, widthBucket].join(":")
}

let databasePromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  databasePromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => {
      databasePromise = null
      reject(request.error)
    }
    request.onupgradeneeded = () => {
      const database = request.result
      for (const name of [...database.objectStoreNames])
        database.deleteObjectStore(name)
      const heights = database.createObjectStore(HEIGHT_STORE, {
        keyPath: "key",
      })
      heights.createIndex("sessionWidth", ["sessionId", "widthBucket"], {
        unique: false,
      })
      const html = database.createObjectStore(HTML_STORE, { keyPath: "key" })
      html.createIndex("width", "widthBucket", { unique: false })
    }
    request.onsuccess = () => {
      const database = request.result
      database.onversionchange = () => {
        database.close()
        databasePromise = null
      }
      resolve(database)
    }
  })
  return databasePromise
}

export async function loadBrowserCacheRows(
  sessionId: string,
  widthBucket: WidthBucket
): Promise<Map<string, BrowserCacheHeightRow>> {
  const database = await openDatabase()
  const rows = await new Promise<BrowserCacheHeightRow[]>((resolve, reject) => {
    const transaction = database.transaction(HEIGHT_STORE, "readonly")
    const request = transaction
      .objectStore(HEIGHT_STORE)
      .index("sessionWidth")
      .getAll([sessionId, widthBucket])
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result as BrowserCacheHeightRow[])
  })
  return new Map(rows.map((row) => [row.messageId, row]))
}

export async function loadBrowserCacheHtml(
  widthBucket: WidthBucket
): Promise<Map<number, string>> {
  const database = await openDatabase()
  const rows = await new Promise<BrowserCacheHtmlRow[]>((resolve, reject) => {
    const transaction = database.transaction(HTML_STORE, "readonly")
    const request = transaction
      .objectStore(HTML_STORE)
      .index("width")
      .getAll(widthBucket)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result as BrowserCacheHtmlRow[])
  })
  rows.sort((a, b) => b.settledAt - a.settledAt)
  return new Map(
    rows.slice(0, HTML_MEMORY_LIMIT).map((row) => [row.contentHash, row.html])
  )
}

export async function putBrowserCacheRow(
  row: BrowserCacheHeightRow,
  html: string
): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      [HEIGHT_STORE, HTML_STORE],
      "readwrite"
    )
    transaction.onerror = () => reject(transaction.error)
    transaction.oncomplete = () => resolve()
    transaction.objectStore(HEIGHT_STORE).put(row)
    transaction.objectStore(HTML_STORE).put({
      key: htmlCacheKey(row.contentHash, row.widthBucket),
      widthBucket: row.widthBucket,
      contentHash: row.contentHash,
      html,
      settledAt: row.settledAt,
    } satisfies BrowserCacheHtmlRow)
  })
}

export async function clearBrowserCache(): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      [HEIGHT_STORE, HTML_STORE],
      "readwrite"
    )
    transaction.onerror = () => reject(transaction.error)
    transaction.oncomplete = () => resolve()
    transaction.objectStore(HEIGHT_STORE).clear()
    transaction.objectStore(HTML_STORE).clear()
  })
}
