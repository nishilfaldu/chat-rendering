export const IMPLEMENTATIONS = {
  "every-message": {
    label: "No virtualization",
    description:
      "Renders all 10,000 messages at once. Upper bound on DOM, lower bound on jump time.",
    cost: "Cost: 10,000 DOM rows · jump is cheap because everything is already mounted",
    legacy: ["naive"],
  },
  measured: {
    label: "TanStack Virtual, measured after mount",
    description:
      "80 px guess per row, measured once mounted, corrected in place. The library defaults.",
    cost: "Cost: 80 px guess per unknown row · re-measure and correct on every visit",
    legacy: ["baseline"],
  },
  estimated: {
    label: "Content-type guess, never corrected",
    description:
      "Clips overflow. Shows why zero corrections alone proves nothing.",
    cost: "Cost: clipped overflow · a zero-correction reading can hide a wrong height",
    legacy: ["height-class"],
  },
  "saved-in-browser": {
    label: "Heights this browser measured before (IndexedDB)",
    description:
      "Reuses measured heights and rendered content after this browser has seen them once.",
    cost: "Cost: IndexedDB reads and writes · per device · per width bucket",
    legacy: ["orbit"],
  },
  "saved-measurements": {
    label: "Heights measured on the server",
    description:
      "Loads measured message heights from the server for each supported content width.",
    cost: "Cost: extra gzipped payload · 200,000 precomputed heights · client still re-measures and posts corrections",
    legacy: ["server-heights"],
  },
  "saved-html": {
    label: "Heights + rendered HTML from the server",
    description:
      "Loads saved message measurements and fetches prerendered content as you scroll.",
    cost: "Cost: HTML fetch on jump · 160-entry working set",
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

export function implementationCost(mode: ChatAppId, extraKbGz?: number): string {
  if (mode === "saved-measurements" && extraKbGz !== undefined) {
    return `Cost: +${extraKbGz} KB payload (gz) · 200,000 precomputed heights · client still re-measures and posts corrections`
  }
  return IMPLEMENTATIONS[mode].cost
}
