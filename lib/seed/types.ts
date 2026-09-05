export const SESSION_ID = "session-bench-001"
export const SEED = 20260315
export const MESSAGE_COUNT = 10_000
export const DATASET_VERSION = "v3"
export const RENDERER_VERSION = "v2"
export const LAYOUT_VERSION = "v4"
export const WIDTH_BUCKET_STEP = 32
export const MIN_WIDTH_BUCKET = 320
export const MAX_WIDTH_BUCKET = 928
declare const widthBucketBrand: unique symbol
export type WidthBucket = number & {
  readonly [widthBucketBrand]: "WidthBucket"
}
export const WIDTH_BUCKETS: WidthBucket[] = Array.from(
  { length: (MAX_WIDTH_BUCKET - MIN_WIDTH_BUCKET) / WIDTH_BUCKET_STEP + 1 },
  (_, index) => (MIN_WIDTH_BUCKET + index * WIDTH_BUCKET_STEP) as WidthBucket
)

export function isWidthBucket(value: number): value is WidthBucket {
  return WIDTH_BUCKETS.some((bucket) => bucket === value)
}

export type Role = "user" | "assistant"
export type MessageKind = "short" | "paragraph" | "code" | "image"
export type HeightClass = "xs" | "sm" | "md" | "lg" | "xl"

export type SeedMessage = {
  id: string
  sessionId: string
  role: Role
  timestamp: number
  kind: MessageKind
  text: string
  codeLang?: string
  imageWidth?: number
  imageHeight?: number
  heightClass: HeightClass
  sortIndex: number
}

export type MessageIndexRow = {
  id: string
  timestamp: number
  heightClass: HeightClass
  measuredPx: number | null
}

export type HeightMeasurement = {
  messageId: string
  widthBucket: WidthBucket
  contentHash: number
  datasetVersion: string
  rendererVersion: string
  layoutVersion: string
  px: number
  measuredAt: number
  source: "headless" | "client"
  settled: boolean
}
