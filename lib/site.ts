const FALLBACK_SITE_URL = "https://chat-rendering.nishilfaldu.site"

function normalizeSiteUrl(value: string | undefined): string | null {
  if (!value) return null

  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`)
    return url.origin
  } catch {
    return null
  }
}

export const SITE_NAME = "Chat rendering"
export const SITE_TITLE = "What should a virtualized chat remember?"
export const SITE_DESCRIPTION =
  "An interactive engineering investigation into reusing geometry and rendered HTML across a virtualized 10,000-message chat."
export const SITE_URL =
  normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
  normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  FALLBACK_SITE_URL
export const AUTHOR = {
  name: "Nishil Faldu",
  url: "https://github.com/nishilfaldu",
} as const
export const REPOSITORY_URL = "https://github.com/nishilfaldu/chat-rendering"

export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString()
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}
