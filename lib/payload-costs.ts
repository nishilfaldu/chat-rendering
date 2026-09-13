import type { ChatAppId } from "@/lib/chat-implementations"

/** Gzipped embed HTML from `next start`, in KB. */
export const PRODUCTION_EMBED_GZ_KB: Record<ChatAppId, number> = {
  "every-message": 489,
  measured: 258,
  estimated: 258,
  "saved-in-browser": 260,
  "saved-measurements": 1077,
  "saved-html": 918,
}
