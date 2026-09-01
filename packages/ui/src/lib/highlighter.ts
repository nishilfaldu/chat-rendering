import { createHighlighter, createJavaScriptRegexEngine, type Highlighter } from "shiki"

const LANGS = ["ts", "tsx", "js", "javascript", "python", "json", "bash", "sql", "go", "rust", "txt"] as const

let highlighterPromise: Promise<Highlighter> | undefined

export function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    langs: [...LANGS],
    themes: ["github-dark"],
    engine: createJavaScriptRegexEngine(),
  })
  return highlighterPromise
}

export function shikiLang(lang: string): string {
  if (lang === "javascript") return "js"
  return LANGS.includes(lang as (typeof LANGS)[number]) ? lang : "txt"
}
