"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CodeToTokenTransformStream } from "@shikijs/stream"
import { ShikiStreamRenderer } from "@shikijs/stream/react"
import type { Highlighter } from "shiki"

import { getHighlighter, shikiLang } from "@workspace/ui/lib/highlighter"

function FallbackCode({ code }: { code: string }) {
  return (
    <pre className="bg-secondary mt-2 overflow-x-auto rounded-md p-3 font-mono text-xs leading-5">
      <code>{code}</code>
    </pre>
  )
}

function StreamingCode({
  code,
  lang,
  highlighter,
}: {
  code: string
  lang: string
  highlighter: Highlighter
}) {
  const seenRef = useRef("")
  const session = useMemo(() => {
    const transformer = new TransformStream<string, string>()
    const stream = transformer.readable.pipeThrough(
      new CodeToTokenTransformStream({
        highlighter,
        lang,
        theme: "github-dark",
        allowRecalls: true,
      })
    )
    return { stream, writer: transformer.writable.getWriter() }
  }, [highlighter, lang])

  useEffect(() => {
    seenRef.current = ""
    return () => {
      void session.writer.close().catch(() => undefined)
    }
  }, [session])

  useEffect(() => {
    const prev = seenRef.current
    if (!code.startsWith(prev)) {
      return
    }
    const delta = code.slice(prev.length)
    if (delta.length === 0) {
      return
    }
    seenRef.current = code
    void session.writer.write(delta)
  }, [code, session])

  return (
    <div className="csb-md mt-2 overflow-x-auto rounded-md text-xs">
      <ShikiStreamRenderer stream={session.stream} />
    </div>
  )
}

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
      return <FallbackCode code={code} />
    }
    return <StreamingCode code={code} lang={resolved} highlighter={highlighter} />
  }

  if (html) {
    return <div className="csb-md" dangerouslySetInnerHTML={{ __html: html }} />
  }

  return <FallbackCode code={code} />
}
