import { createHighlighter, type Highlighter } from "shiki"
import { textToHtml, splitMarkdown } from "./markdown.ts"
import type { SeedMessage } from "./types.ts"

const LANGS = [
  "ts",
  "tsx",
  "js",
  "javascript",
  "python",
  "json",
  "bash",
  "sql",
  "go",
  "rust",
  "txt",
] as const

let highlighterPromise: Promise<Highlighter> | undefined
const htmlCache = new Map<string, string>()

async function highlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    langs: [...LANGS],
    themes: ["github-dark"],
  })
  return highlighterPromise
}

function imageHtml(message: SeedMessage): string {
  const width = message.imageWidth ?? 800
  const height = message.imageHeight ?? 450
  return `<div class="csb-image" style="aspect-ratio:${width}/${height}" data-w="${width}" data-h="${height}"><span>${width}×${height}</span></div>`
}

export async function prerenderMessage(message: SeedMessage): Promise<string> {
  const hi = await highlighter()
  const parts: string[] = []
  if (message.kind === "image") {
    parts.push(`<p>${textToHtml(message.text).replace(/^<p>|<\/p>$/g, "")}</p>`)
    parts.push(imageHtml(message))
    return parts.join("")
  }
  for (const block of splitMarkdown(message.text)) {
    if (block.type === "text") {
      parts.push(textToHtml(block.text))
      continue
    }
    const lang = LANGS.includes(block.lang as (typeof LANGS)[number])
      ? block.lang
      : "txt"
    const cacheKey = `${lang}\n${block.code}`
    const cached = htmlCache.get(cacheKey)
    if (cached) {
      parts.push(cached)
      continue
    }
    const html = hi.codeToHtml(block.code, {
      lang,
      theme: "github-dark",
    })
    htmlCache.set(cacheKey, html)
    parts.push(html)
  }
  return parts.join("")
}
