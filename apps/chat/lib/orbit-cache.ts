import {
  DATASET_VERSION,
  LAYOUT_VERSION,
  RENDERER_VERSION,
  type WidthBucket,
} from "@chat-surface-bench/seed"

const DB_NAME = "railgun-orbit-cache"
const DB_VERSION = 2
const HEIGHT_STORE = "heights"
const HTML_STORE = "html"
const HTML_MEMORY_LIMIT = 2_000

export type OrbitHeightRow = {
  key: string
  sessionId: string
  messageId: string
  widthBucket: WidthBucket
  contentHash: number
  datasetVersion: string
  rendererVersion: string
  layoutVersion: string
  height: number
  settledAt: number
}

type OrbitHtmlRow = {
  key: string
  widthBucket: WidthBucket
  contentHash: number
  rendererVersion: string
  layoutVersion: string
  html: string
  settledAt: number
}

export function orbitCacheKey(input: {
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
    DATASET_VERSION,
    RENDERER_VERSION,
    LAYOUT_VERSION,
  ].join(":")
}

function htmlCacheKey(contentHash: number, widthBucket: WidthBucket): string {
  return [contentHash, widthBucket, RENDERER_VERSION, LAYOUT_VERSION].join(":")
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

export async function loadOrbitRows(
  sessionId: string,
  widthBucket: WidthBucket
): Promise<Map<string, OrbitHeightRow>> {
  const database = await openDatabase()
  const rows = await new Promise<OrbitHeightRow[]>((resolve, reject) => {
    const transaction = database.transaction(HEIGHT_STORE, "readonly")
    const request = transaction
      .objectStore(HEIGHT_STORE)
      .index("sessionWidth")
      .getAll([sessionId, widthBucket])
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result as OrbitHeightRow[])
  })
  return new Map(
    rows
      .filter(
        (row) =>
          row.datasetVersion === DATASET_VERSION &&
          row.rendererVersion === RENDERER_VERSION &&
          row.layoutVersion === LAYOUT_VERSION
      )
      .map((row) => [row.messageId, row])
  )
}

export async function loadOrbitHtml(
  widthBucket: WidthBucket
): Promise<Map<number, string>> {
  const database = await openDatabase()
  const rows = await new Promise<OrbitHtmlRow[]>((resolve, reject) => {
    const transaction = database.transaction(HTML_STORE, "readonly")
    const request = transaction
      .objectStore(HTML_STORE)
      .index("width")
      .getAll(widthBucket)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result as OrbitHtmlRow[])
  })
  rows.sort((a, b) => b.settledAt - a.settledAt)
  return new Map(
    rows
      .filter(
        (row) =>
          row.rendererVersion === RENDERER_VERSION &&
          row.layoutVersion === LAYOUT_VERSION
      )
      .slice(0, HTML_MEMORY_LIMIT)
      .map((row) => [row.contentHash, row.html])
  )
}

export async function putOrbitRow(
  row: OrbitHeightRow,
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
      rendererVersion: row.rendererVersion,
      layoutVersion: row.layoutVersion,
      html,
      settledAt: row.settledAt,
    } satisfies OrbitHtmlRow)
  })
}

export async function clearOrbitRows(): Promise<void> {
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
