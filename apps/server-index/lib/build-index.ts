import {
  WIDTH_BUCKETS,
  estimatePx,
  generateMessages,
  type HeightClass,
  type WidthBucket,
} from "@chat-surface-bench/seed"

export type BucketTable = {
  sizes: number[]
  offsets: number[]
  total: number
}

export type ServerChatIndex = {
  buckets: Record<WidthBucket, BucketTable>
}

function tableForBucket(heightClasses: HeightClass[], bucket: WidthBucket): BucketTable {
  const sizes = heightClasses.map((heightClass) => estimatePx(heightClass, bucket))
  const offsets: number[] = Array.from({ length: sizes.length })
  let acc = 0
  for (let i = 0; i < sizes.length; i++) {
    offsets[i] = acc
    acc += sizes[i] ?? 0
  }
  return { sizes, offsets, total: acc }
}

let cached: ServerChatIndex | undefined

export function buildServerIndex(): ServerChatIndex {
  if (cached) return cached
  const heightClasses = generateMessages().map((message) => message.heightClass)
  const buckets = {} as Record<WidthBucket, BucketTable>
  for (const bucket of WIDTH_BUCKETS) {
    buckets[bucket] = tableForBucket(heightClasses, bucket)
  }
  cached = { buckets }
  return cached
}
