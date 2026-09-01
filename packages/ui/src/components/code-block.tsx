"use client"

import { useEffect, useState } from "react"
import { ShikiCachedRenderer } from "@shikijs/stream/react"
import type { Highlighter } from "shiki"

import { getHighlighter, shikiLang } from "@workspace/ui/lib/highlighter"

export function CodeBlock({
  code,
  lang,
  streaming,
}: {
  code: string
  lang: string
  streaming?: boolean
}) {
  const resolved = shikiLang(lang)
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null)
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let gone = false
    void getHighlighter().then((instance) => {
      if (gone) return
      setHighlighter(instance)
      if (!streaming) {
        setHtml(
          instance.codeToHtml(code, {
            lang: resolved,
            theme: "github-dark",
          })
        )
      }
    })
    return () => {
      gone = true
    }
  }, [code, resolved, streaming])

  if (streaming) {
    if (!highlighter) {
      return (
        <pre className="bg-secondary mt-2 overflow-x-auto rounded-md p-3 font-mono text-xs leading-5">
          <code>{code}</code>
        </pre>
      )
    }
    return (
      <div className="csb-md mt-2 overflow-x-auto rounded-md text-xs">
        <ShikiCachedRenderer highlighter={highlighter} code={code} lang={resolved} theme="github-dark" />
      </div>
    )
  }

  if (html) {
    return <div className="csb-md" dangerouslySetInnerHTML={{ __html: html }} />
  }

  return (
    <pre className="bg-secondary mt-2 overflow-x-auto rounded-md p-3 font-mono text-xs leading-5">
      <code>{code}</code>
    </pre>
  )
}
