export const IMPLEMENTATIONS = {
  "every-message": {
    label: "No virtualization",
    legacy: ["naive"],
  },
  measured: {
    label: "TanStack Virtual",
    legacy: ["baseline"],
  },
  estimated: {
    label: "Content-type guess, never corrected",
    legacy: ["height-class"],
  },
  "saved-in-browser": {
    label: "Browser cache (IndexedDB)",
    legacy: ["orbit"],
  },
  "saved-measurements": {
    label: "Precomputed (fetched from server)",
    legacy: ["server-heights"],
  },
  "saved-html": {
    label: "Precomputed + baked HTML",
    legacy: ["server-index"],
  },
} as const

export type ChatAppId = keyof typeof IMPLEMENTATIONS

export const CHAT_APP_IDS = Object.keys(IMPLEMENTATIONS) as ChatAppId[]

export const PICKER_IDS = [
  "measured",
  "saved-in-browser",
  "saved-measurements",
  "saved-html",
] as const satisfies readonly ChatAppId[]

const IMPLEMENTATION_TIPS: Partial<Record<ChatAppId, string>> = {
  "saved-html": "Prerendered message HTML.",
}

export function implementationTip(id: ChatAppId): string | undefined {
  return IMPLEMENTATION_TIPS[id]
}

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
