export const APP_LINKS = [
  {
    id: "every-message",
    label: "Every message",
    description:
      "Renders all 10,000 messages at once: simple, but expensive at scale.",
  },
  {
    id: "measured",
    label: "Measured in the browser",
    description:
      "Virtualizes 10,000 messages from one rough estimate, then fixes each height in the browser.",
  },
  {
    id: "estimated",
    label: "Estimated by content type",
    description:
      "Uses fixed estimates for each content type. This control can clip messages because it does not correct its estimates.",
  },
  {
    id: "saved-in-browser",
    label: "Saved in this browser",
    description:
      "Reuses measured heights and rendered content after this browser has seen them once.",
  },
  {
    id: "saved-measurements",
    label: "Saved measurements",
    description:
      "Loads measured message heights from the server for each supported content width.",
  },
  {
    id: "saved-html",
    label: "Saved measurements + HTML",
    description:
      "Loads saved message measurements and fetches prerendered content as you scroll.",
  },
] as const

export type ChatAppId = (typeof APP_LINKS)[number]["id"]

const LEGACY_CHAT_APP_IDS = {
  naive: "every-message",
  baseline: "measured",
  "height-class": "estimated",
  orbit: "saved-in-browser",
  "server-heights": "saved-measurements",
  "server-index": "saved-html",
} as const

export function isChatAppId(value: string): value is ChatAppId {
  return APP_LINKS.some((item) => item.id === value)
}

export function resolveChatAppId(value: string): ChatAppId | null {
  if (isChatAppId(value)) return value
  const mapped =
    LEGACY_CHAT_APP_IDS[value as keyof typeof LEGACY_CHAT_APP_IDS]
  return mapped ?? null
}

export function implementationLabel(mode: string): string | undefined {
  const id = resolveChatAppId(mode)
  return id
    ? APP_LINKS.find((item) => item.id === id)?.label
    : undefined
}

export function conversationPath(mode: ChatAppId): string {
  return `/embed/${mode}`
}
