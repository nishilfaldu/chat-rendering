"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { generateMessages, replayStream, type SeedMessage } from "@chat-surface-bench/seed"
import { BenchProvider, Hud, timeJump, useBench, useBenchSession } from "@chat-surface-bench/bench"
import { ChatColumn } from "@workspace/ui/components/chat-column"
import { ChatFrame } from "@workspace/ui/components/chat-frame"
import { Composer } from "@workspace/ui/components/composer"
import { MessageBubble } from "@workspace/ui/components/message-bubble"

const FLAT_ESTIMATE = 80

function BaselineShell({
  messages,
  onReset,
}: {
  messages: SeedMessage[]
  onReset: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [streaming, setStreaming] = useState<{ id: string; text: string } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const { recordJump, setCache, snapshot } = useBench()

  useLayoutEffect(() => {
    setScrollEl(scrollRef.current)
  }, [])

  useBenchSession({
    root: scrollEl,
    scroll: scrollEl,
    messageCount: messages.length,
  })

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => FLAT_ESTIMATE,
    enabled: scrollEl !== null,
    useFlushSync: false,
  })

  useEffect(() => {
    if (!scrollEl || snapshot.cache === "warm") return
    const onScroll = () => {
      setCache("warm")
    }
    scrollEl.addEventListener("scroll", onScroll, { passive: true, once: true })
    return () => {
      scrollEl.removeEventListener("scroll", onScroll)
    }
  }, [scrollEl, setCache, snapshot.cache])

  async function onJumpTo(n: number) {
    const index = Math.min(Math.max(n, 0), messages.length - 1)
    const ms = await timeJump(async () => {
      virtualizer.scrollToIndex(index, { align: "start" })
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
      })
    })
    recordJump(index, ms)
  }

  async function onStreamLast() {
    const lastIndex = messages.length - 1
    const last = messages[lastIndex]
    if (!last) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    virtualizer.scrollToIndex(lastIndex, { align: "end" })
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
      appId="baseline"
      title="baseline"
      implementsList={[
        "@tanstack/react-virtual defaults",
        "in-memory measurement cache",
        "ResizeObserver per row",
        "flat estimateSize",
      ]}
      doesNotList={["height-class estimates", "server index", "sticky bottom anchoring"]}
      cacheLabel={snapshot.cache}
      onJumpTo={onJumpTo}
      onStreamLast={onStreamLast}
      onCacheReset={onReset}
      hud={<Hud />}
    >
      <ChatColumn scrollRef={scrollRef} composer={<Composer onSend={() => undefined} />}>
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((row) => {
            const message = messages[row.index]
            if (!message) return null
            return (
              <div
                key={row.key}
                data-index={row.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${row.start}px)`,
                }}
              >
                <MessageBubble
                  message={message}
                  streamingText={streaming?.id === message.id ? streaming.text : undefined}
                />
              </div>
            )
          })}
        </div>
      </ChatColumn>
    </ChatFrame>
  )
}

export function BaselineApp() {
  const messages = useMemo(() => generateMessages(), [])
  const [epoch, setEpoch] = useState(0)

  return (
    <BenchProvider key={epoch} appId="baseline" cache="cold">
      <BaselineShell messages={messages} onReset={() => setEpoch((value) => value + 1)} />
    </BenchProvider>
  )
}
