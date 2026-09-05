import {
  WIDTH_BUCKETS,
  estimatePx,
  hashContent,
  type HeightClass,
  type SeedMessage,
  type WidthBucket,
} from "@/lib/seed"
import {
  getPrerenderedHtmlBatch,
  listIndex,
  listMessages,
} from "@/lib/seed/db"

export type BucketTable = {
  sizes: number[]
  offsets: number[]
  measured: boolean[]
  total: number
}

export type ServerChatIndex = {
  buckets: Record<WidthBucket, BucketTable>
}

type IndexedMessageBase = Omit<SeedMessage, "text"> & {
  contentHash: number
}

export type MarkdownIndexedMessage = IndexedMessageBase & {
  content: { kind: "markdown"; markdown: string }
}

export type HtmlIndexedMessage = IndexedMessageBase & {
  content: { kind: "html"; html: string | null }
}

type ServerPayloadBase = {
  index: ServerChatIndex
  warm: boolean
  measuredCount: number
  expectedCount: number
  initialWindowStart: number
  serverQueryMs: number
}

export type ServerHeightsPayload = ServerPayloadBase & {
  mode: "server-heights"
  messages: MarkdownIndexedMessage[]
}

export type ServerIndexPayload = ServerPayloadBase & {
  mode: "server-index"
  messages: HtmlIndexedMessage[]
  streamSource: { id: string; text: string } | null
}

const INITIAL_HTML_WINDOW = 48

function tableFromSizes(sizes: number[], measured: boolean[]): BucketTable {
  const offsets: number[] = Array.from({ length: sizes.length })
  let total = 0
  for (let index = 0; index < sizes.length; index += 1) {
    offsets[index] = total
    total += sizes[index] ?? 0
  }
  return { sizes, offsets, measured, total }
}

export type MeasurementState = "saved" | "cold" | "partial"

function loadBase(
  state: MeasurementState = "saved"
): ServerPayloadBase & { source: SeedMessage[] } {
  const started = performance.now()
  const source = listMessages()
  if (source.length === 0) {
    throw new Error("seed sqlite is empty — run pnpm seed")
  }

  const buckets = {} as Record<WidthBucket, BucketTable>
  let measuredCount = 0
  for (const bucket of WIDTH_BUCKETS) {
    const rows = listIndex({ widthBucket: bucket, limit: source.length })
    const measured = rows.map(
      (row, index) =>
        state !== "cold" &&
        (state !== "partial" || index % 2 === 0) &&
        row.measuredPx !== null &&
        Number.isFinite(row.measuredPx)
    )
    measuredCount += measured.filter(Boolean).length
    const sizes = rows.map((row, index) => {
      if (measured[index] && row.measuredPx !== null) {
        return row.measuredPx
      }
      const heightClass = (row.heightClass ??
        source[index]?.heightClass ??
        "sm") as HeightClass
      return estimatePx(heightClass, bucket)
    })
    buckets[bucket] = tableFromSizes(sizes, measured)
  }
  const expectedCount = source.length * WIDTH_BUCKETS.length
  return {
    source,
    index: { buckets },
    warm: measuredCount === expectedCount,
    measuredCount,
    expectedCount,
    initialWindowStart: Math.max(0, source.length - INITIAL_HTML_WINDOW),
    serverQueryMs: performance.now() - started,
  }
}

function metadata(message: SeedMessage): IndexedMessageBase {
  const { text, ...rest } = message
  return { ...rest, contentHash: hashContent(text) }
}

export function loadServerHeightsPayload(
  state: MeasurementState = "saved"
): ServerHeightsPayload {
  const base = loadBase(state)
  const { source, ...shared } = base
  return {
    ...shared,
    mode: "server-heights",
    messages: source.map((message) => ({
      ...metadata(message),
      content: { kind: "markdown", markdown: message.text },
    })),
  }
}

export function loadServerIndexPayload(
  state: MeasurementState = "saved"
): ServerIndexPayload {
  const started = performance.now()
  const base = loadBase(state)
  const { source, ...shared } = base
  const initialIds = source
    .slice(base.initialWindowStart)
    .map((message) => message.id)
  const initialHtml = getPrerenderedHtmlBatch(initialIds)
  const last = source.at(-1)
  return {
    ...shared,
    mode: "server-index",
    messages: source.map((message) => ({
      ...metadata(message),
      content: { kind: "html", html: initialHtml.get(message.id) ?? null },
    })),
    streamSource: last ? { id: last.id, text: last.text } : null,
    serverQueryMs: performance.now() - started,
  }
}
