import { NextResponse } from "next/server"
import {
  DATASET_VERSION,
  LAYOUT_VERSION,
  RENDERER_VERSION,
  hashContent,
  isWidthBucket,
} from "@chat-surface-bench/seed"
import { getMessage, upsertHeight } from "@chat-surface-bench/seed/db"

export const dynamic = "force-dynamic"

type HeightWrite = {
  messageId?: unknown
  widthBucket?: unknown
  contentHash?: unknown
  px?: unknown
}

export async function POST(request: Request): Promise<NextResponse> {
  const input = (await request.json().catch(() => null)) as HeightWrite | null
  if (!input) {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }
  const messageId = typeof input.messageId === "string" ? input.messageId : ""
  const bucket = Number(input.widthBucket)
  const contentHash = Number(input.contentHash)
  const px = Number(input.px)
  const message = getMessage(messageId)
  if (
    !message ||
    !Number.isFinite(bucket) ||
    !isWidthBucket(bucket) ||
    !Number.isFinite(contentHash) ||
    hashContent(message.text) !== contentHash ||
    !Number.isFinite(px) ||
    px <= 0 ||
    px > 20_000
  ) {
    return NextResponse.json({ error: "invalid measurement" }, { status: 400 })
  }
  upsertHeight({
    messageId,
    widthBucket: bucket,
    contentHash,
    datasetVersion: DATASET_VERSION,
    rendererVersion: RENDERER_VERSION,
    layoutVersion: LAYOUT_VERSION,
    px,
    measuredAt: Date.now(),
    source: "client",
    settled: true,
  })
  return NextResponse.json({ ok: true })
}
