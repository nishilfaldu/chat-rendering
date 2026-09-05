export const IMPLEMENTATIONS = {
  "every-message": {
    label: "Every message",
    description:
      "Renders all 10,000 messages at once: simple, but expensive at scale.",
    legacy: ["naive"],
  },
  measured: {
    label: "Measured in the browser",
    description:
      "Virtualizes 10,000 messages from one rough estimate, then fixes each height in the browser.",
    legacy: ["baseline"],
  },
  estimated: {
    label: "Estimated by content type",
    description:
      "Uses fixed estimates for each content type. This control can clip messages because it does not correct its estimates.",
    legacy: ["height-class"],
  },
  "saved-in-browser": {
    label: "Saved in this browser",
    description:
      "Reuses measured heights and rendered content after this browser has seen them once.",
    legacy: ["orbit"],
  },
  "saved-measurements": {
    label: "Saved measurements",
    description:
      "Loads measured message heights from the server for each supported content width.",
    legacy: ["server-heights"],
  },
  "saved-html": {
    label: "Saved measurements + HTML",
    description:
      "Loads saved message measurements and fetches prerendered content as you scroll.",
    legacy: ["server-index"],
  },
} as const

export type ChatAppId = keyof typeof IMPLEMENTATIONS

export const CHAT_APP_IDS = Object.keys(IMPLEMENTATIONS) as ChatAppId[]

export const APP_LINKS = CHAT_APP_IDS.map((id) => ({
  id,
  label: IMPLEMENTATIONS[id].label,
  description: IMPLEMENTATIONS[id].description,
}))

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
