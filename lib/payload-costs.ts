import type { ChatAppId } from "@/lib/chat-implementations"

/** Gzipped embed HTML from `next start`, in KB. Filled from a production build. */
export const PRODUCTION_EMBED_GZ_KB: Record<ChatAppId, number | null> = {
  "every-message": null,
  measured: null,
  estimated: null,
  "saved-in-browser": null,
  "saved-measurements": null,
  "saved-html": null,
}

export function extraPayloadKbGz(mode: ChatAppId): number | undefined {
  const baseline = PRODUCTION_EMBED_GZ_KB.measured
  const current = PRODUCTION_EMBED_GZ_KB[mode]
  if (baseline === null || current === null) return undefined
  return Math.max(0, Math.round(current - baseline))
}
