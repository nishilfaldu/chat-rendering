"use client"

import { useEffect, useRef, useState } from "react"
import { ShikiStreamTokenizer } from "@shikijs/stream"
import { getTokenStyleObject, type Highlighter, type ThemedToken } from "shiki"

import { getHighlighter, shikiLang } from "@/lib/highlighter"

function FallbackCode({ code }: { code: string }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-md bg-secondary p-3 font-mono text-xs leading-5">
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
  const sessionRef = useRef<{
    tokenizer: ShikiStreamTokenizer
    seen: string
    active: boolean
    queue: Promise<void>
  } | null>(null)
  const [tokens, setTokens] = useState<ThemedToken[]>([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    // Each effect setup owns its tokenizer, including development effect replay.
    const session = {
      tokenizer: new ShikiStreamTokenizer({
        highlighter,
        lang,
        theme: "github-dark",
      }),
      seen: "",
      active: true,
      queue: Promise.resolve(),
    }
    sessionRef.current = session
    return () => {
      session.active = false
    }
  }, [highlighter, lang])

  useEffect(() => {
    const session = sessionRef.current!
    session.queue = session.queue
      .then(async () => {
        if (!session.active) return
        if (!code.startsWith(session.seen)) {
          session.tokenizer.clear()
          session.seen = ""
        }
        const delta = code.slice(session.seen.length)
        session.seen = code
        if (!delta) return
        await session.tokenizer.enqueue(delta)
        if (session.active) {
          setTokens([
            ...session.tokenizer.tokensStable,
            ...session.tokenizer.tokensUnstable,
          ])
          setFailed(false)
        }
      })
      .catch(() => {
        if (session.active) setFailed(true)
      })
  }, [code, highlighter, lang])

  if (failed) return <FallbackCode code={code} />
  return (
    <div className="csb-md mt-2 overflow-x-auto rounded-md text-xs">
      <pre className="shiki shiki-stream">
        <code>
          {tokens.map((token, index) => (
            <span
              key={index}
              style={token.htmlStyle || getTokenStyleObject(token)}
            >
              {token.content}
            </span>
          ))}
        </code>
      </pre>
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
    return (
      <StreamingCode code={code} lang={resolved} highlighter={highlighter} />
    )
  }

  if (html) {
    return <div className="csb-md" dangerouslySetInnerHTML={{ __html: html }} />
  }

  return <FallbackCode code={code} />
}
