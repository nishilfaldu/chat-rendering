export const IMPLEMENTATIONS = {
  "every-message": {
    label: "No virtualization",
    description: "Mounts all 10,000 messages. Jump does not need an estimate.",
    cost: "Cost: 10,000 DOM rows. Jump is cheap because the rows are already mounted.",
    legacy: ["naive"],
  },
  measured: {
    label: "TanStack Virtual, measured after mount",
    description:
      "80 px guess per unmounted row. Measured after mount. Corrected in place.",
    cost: "Cost: 80 px guess per unknown row. Re-measure and correct on every visit.",
    legacy: ["baseline"],
  },
  estimated: {
    label: "Content-type guess, never corrected",
    description:
      "Clips overflow. Zero corrections can still be a wrong height.",
    cost: "Cost: clipped overflow. A zero-correction reading can hide a wrong height.",
    legacy: ["height-class"],
  },
  "saved-in-browser": {
    label: "Heights this browser already measured (IndexedDB)",
    description:
      "Reads heights and HTML from IndexedDB after this browser has measured them.",
    cost: "Cost: IndexedDB reads and writes. Per device. Per width bucket.",
    legacy: ["orbit"],
  },
  "saved-measurements": {
    label: "Heights measured on the server",
    description:
      "Ships 20 per-bucket height tables with the page. Binary search for a row at an offset.",
    cost: "Cost: extra gzipped payload. 200,000 precomputed heights. Client still re-measures and posts corrections.",
    legacy: ["server-heights"],
  },
  "saved-html": {
    label: "Heights + rendered HTML from the server",
    description:
      "Same tables plus prerendered HTML. Jump fetches bodies into a 160-entry working set.",
    cost: "Cost: HTML fetch on jump. 160-entry working set.",
    legacy: ["server-index"],
  },
} as const

export type ChatAppId = keyof typeof IMPLEMENTATIONS

export const CHAT_APP_IDS = Object.keys(IMPLEMENTATIONS) as ChatAppId[]

export const IMPLEMENTATION_GROUPS = [
  {
    id: "baseline",
    label: "Baseline",
    ids: ["measured"],
  },
  {
    id: "height-sources",
    label: "Height sources",
    ids: ["saved-in-browser", "saved-measurements", "saved-html"],
  },
  {
    id: "controls",
    label: "Controls",
    ids: ["every-message", "estimated"],
  },
] as const satisfies ReadonlyArray<{
  id: string
  label: string
  ids: readonly ChatAppId[]
}>

const LEGACY_TO_ID = Object.fromEntries(
  CHAT_APP_IDS.flatMap((id) =>
    IMPLEMENTATIONS[id].legacy.map((legacy) => [legacy, id])
  )
) as Record<string, ChatAppId>

export function resolveChatAppId(value: string): ChatAppId | null {
  if (Object.hasOwn(IMPLEMENTATIONS, value)) return value as ChatAppId
  return LEGACY_TO_ID[value] ?? null
}

export function implementationLabel(mode: string): string | undefined {
  const id = resolveChatAppId(mode)
  return id ? IMPLEMENTATIONS[id].label : undefined
}

export function conversationPath(mode: ChatAppId): string {
  return `/embed/${mode}`
}

export function implementationCost(
  mode: ChatAppId,
  extraKbGz?: number
): string {
  if (mode === "saved-measurements" && extraKbGz !== undefined) {
    return `Cost: +${extraKbGz} KB payload (gz). 200,000 precomputed heights. Client still re-measures and posts corrections.`
  }
  if (mode === "saved-html" && extraKbGz !== undefined) {
    return `Cost: +${extraKbGz} KB payload (gz). HTML fetch on jump. 160-entry working set.`
  }
  return IMPLEMENTATIONS[mode].cost
}
