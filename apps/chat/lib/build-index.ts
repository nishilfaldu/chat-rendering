import {
  MESSAGE_COUNT,
  WIDTH_BUCKETS,
  estimatePx,
  type HeightClass,
  type SeedMessage,
  type WidthBucket,
} from "@chat-surface-bench/seed"
import {
  heightMeasurementCount,
  listIndex,
  listMessages,
  listPrerenderedHtml,
  measurementsAreWarm,
} from "@chat-surface-bench/seed/db"

export type BucketTable = {
  sizes: number[]
  offsets: number[]
  total: number
}

export type ServerChatIndex = {
  buckets: Record<WidthBucket, BucketTable>
}

export type ServerIndexPayload = {
  messages: SeedMessage[]
  index: ServerChatIndex
  initialHtml: Record<string, string>
  warm: boolean
  measuredCount: number
  expectedCount: number
}

const INITIAL_HTML_WINDOW = 48

function tableFromSizes(sizes: number[]): BucketTable {
  const offsets: number[] = Array.from({ length: sizes.length })
  let acc = 0
  for (let i = 0; i < sizes.length; i++) {
    offsets[i] = acc
    acc += sizes[i] ?? 0
  }
  return { sizes, offsets, total: acc }
}

export function loadServerIndexPayload(): ServerIndexPayload {
  const source = listMessages()
  if (source.length === 0) {
    throw new Error("seed sqlite is empty — run pnpm seed")
  }
  const html = listPrerenderedHtml()
  const last = source.length - 1
  const messages = source.map((message, index) =>
    index === last ? message : { ...message, text: "" },
  )
  const initialHtml: Record<string, string> = {}
  for (const message of messages.slice(-INITIAL_HTML_WINDOW)) {
    const row = html.get(message.id)
    if (row) initialHtml[message.id] = row
  }

  const buckets = {} as Record<WidthBucket, BucketTable>
  const warm = measurementsAreWarm() && source.length === MESSAGE_COUNT
  for (const bucket of WIDTH_BUCKETS) {
    const rows = listIndex({ widthBucket: bucket })
    const sizes = rows.map((row, index) => {
      if (row.measuredPx !== null && Number.isFinite(row.measuredPx)) {
        return row.measuredPx
      }
      const heightClass = (row.heightClass ?? source[index]?.heightClass ?? "sm") as HeightClass
      return estimatePx(heightClass, bucket)
    })
    buckets[bucket] = tableFromSizes(sizes)
  }

  return {
    messages,
    index: { buckets },
    initialHtml,
    warm,
    measuredCount: heightMeasurementCount(),
    expectedCount: MESSAGE_COUNT * WIDTH_BUCKETS.length,
  }
}
