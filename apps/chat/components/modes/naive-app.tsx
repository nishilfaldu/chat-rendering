"use client"

import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { generateMessages, replayStream, type SeedMessage } from "@chat-surface-bench/seed"
import { BenchProvider, Hud, timeJump, useBench, useBenchSession } from "@chat-surface-bench/bench"
import { ChatColumn } from "@workspace/ui/components/chat-column"
import { ChatFrame } from "@workspace/ui/components/chat-frame"
import { Composer } from "@workspace/ui/components/composer"
import { MessageList } from "@workspace/ui/components/message-list"

function NaiveChat({ messages }: { messages: SeedMessage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [streaming, setStreaming] = useState<{ id: string; text: string } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const { recordJump } = useBench()

  useLayoutEffect(() => {
    setScrollEl(scrollRef.current)
  }, [])

  useBenchSession({
    root: scrollEl,
    scroll: scrollEl,
    messageCount: messages.length,
  })

  async function onJumpTo(n: number) {
    const index = Math.min(Math.max(n, 0), messages.length - 1)
    const target = messages[index]
    const ms = await timeJump(() => {
      if (!target || !scrollEl) return
      const node = scrollEl.querySelector(`[data-message-id="${CSS.escape(target.id)}"]`)
      node?.scrollIntoView()
    })
    recordJump(index, ms)
  }

  async function onStreamLast() {
    const last = messages[messages.length - 1]
    if (!last) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setStreaming({ id: last.id, text: "" })
    await replayStream({
      text: last.text,
      signal: ac.signal,
      onToken: (text) => {
        setStreaming({ id: last.id, text })
      },
    })
    if (!ac.signal.aborted) {
      setStreaming(null)
    }
  }

  return (
    <ChatFrame
      appId="naive"
      title="naive"
      implementsList={["all 10,000 messages in the DOM", "browser-default scroll anchoring"]}
      doesNotList={["virtualization", "custom overflow-anchor", "measured height cache"]}
      cacheLabel="n/a"
      onJumpTo={onJumpTo}
      onStreamLast={onStreamLast}
      hud={<Hud />}
    >
      <ChatColumn scrollRef={scrollRef} composer={<Composer onSend={() => undefined} />}>
        <MessageList messages={messages} streaming={streaming} />
      </ChatColumn>
    </ChatFrame>
  )
}

export function NaiveApp() {
  const messages = useMemo(() => generateMessages(), [])
  return (
    <BenchProvider appId="naive" cache="n/a">
      <NaiveChat messages={messages} />
    </BenchProvider>
  )
}
