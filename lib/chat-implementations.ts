export const APP_LINKS = [
  {
    id: "naive",
    label: "Every message",
    description:
      "Renders all 10,000 messages at once: simple, but expensive at scale.",
  },
  {
    id: "baseline",
    label: "Measured in the browser",
    description:
      "Virtualizes 10,000 messages from one rough estimate, then fixes each height in the browser.",
  },
  {
    id: "height-class",
    label: "Estimated by content type",
    description:
      "Uses fixed estimates for each content type. This control can clip messages because it does not correct its estimates.",
  },
  {
    id: "orbit",
    label: "Saved in this browser",
    description:
      "Reuses measured heights and rendered content after this browser has seen them once.",
  },
  {
    id: "server-heights",
    label: "Saved measurements",
    description:
      "Loads measured message heights from the server for each supported content width.",
  },
  {
    id: "server-index",
    label: "Saved measurements + HTML",
    description:
      "Loads saved message measurements and fetches prerendered content as you scroll.",
  },
] as const

export type ChatAppId = (typeof APP_LINKS)[number]["id"]

export function isChatAppId(value: string): value is ChatAppId {
  return APP_LINKS.some((item) => item.id === value)
}

export function conversationPath(mode: ChatAppId): string {
  return `/embed/${mode}`
}
