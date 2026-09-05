import {
  MAX_WIDTH_BUCKET,
  MIN_WIDTH_BUCKET,
  WIDTH_BUCKET_STEP,
  type HeightClass,
  type SeedMessage,
  type WidthBucket,
} from "./types.ts"

const CLASS_PX: Record<HeightClass, { narrow: number; wide: number }> = {
  xs: { narrow: 68, wide: 52 },
  sm: { narrow: 116, wide: 80 },
  md: { narrow: 220, wide: 136 },
  lg: { narrow: 380, wide: 228 },
  xl: { narrow: 640, wide: 372 },
}

export function predictHeightClass(input: {
  text: string
  kind: SeedMessage["kind"]
  imageWidth?: number
  imageHeight?: number
}): HeightClass {
  if (input.kind === "image") {
    const w = input.imageWidth ?? 800
    const h = input.imageHeight ?? 450
    return h / w > 0.9 ? "xl" : "lg"
  }
  const fences = (input.text.match(/```/g) ?? []).length
  const chars = input.text.length
  if (fences >= 2 || input.kind === "code") {
    const lines = input.text.split("\n").length
    return lines > 24 ? "xl" : "lg"
  }
  if (chars < 72) return "xs"
  if (chars < 220) return "sm"
  if (chars < 700) return "md"
  if (chars < 1600) return "lg"
  return "xl"
}

export function estimatePx(
  heightClass: HeightClass,
  bucket: WidthBucket
): number {
  const range = CLASS_PX[heightClass]
  const progress =
    (Math.min(Math.max(bucket, MIN_WIDTH_BUCKET), MAX_WIDTH_BUCKET) -
      MIN_WIDTH_BUCKET) /
    (MAX_WIDTH_BUCKET - MIN_WIDTH_BUCKET)
  return Math.round(range.narrow + (range.wide - range.narrow) * progress)
}

export function widthBucket(px: number): WidthBucket {
  const clamped = Math.min(Math.max(px, MIN_WIDTH_BUCKET), MAX_WIDTH_BUCKET)
  return (MIN_WIDTH_BUCKET +
    Math.floor((clamped - MIN_WIDTH_BUCKET) / WIDTH_BUCKET_STEP) *
      WIDTH_BUCKET_STEP) as WidthBucket
}
