export const IMPLEMENTATIONS = {
  "every-message": {
    label: "No virtualization",
    description: "Mounts all 10,000 messages. Jump does not need an estimate.",
    legacy: ["naive"],
  },
  measured: {
    label: "TanStack Virtual, measured after mount",
    description:
      "80 px guess per unmounted row. Measured after mount. Corrected in place.",
    legacy: ["baseline"],
  },
  estimated: {
    label: "Content-type guess, never corrected",
    description:
      "Clips overflow. Zero corrections can still be a wrong height.",
    legacy: ["height-class"],
  },
  "saved-in-browser": {
    label: "Heights this browser already measured (IndexedDB)",
    description:
      "This browser stores measured heights and reuses them on the next visit.",
    legacy: ["orbit"],
  },
  "saved-measurements": {
    label: "Heights measured on the server",
    description: "Measured heights live on the server and ship with the page.",
    legacy: ["server-heights"],
  },
  "saved-html": {
    label: "Heights + rendered HTML from the server",
    description:
      "Same server heights plus prerendered HTML. Jump fetches bodies into a 160-entry working set.",
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
