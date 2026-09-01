"use client"

import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  estimatePx,
  generateMessages,
  replayStream,
  widthBucket,
  type SeedMessage,
  type WidthBucket,
} from "@chat-surface-bench/seed"
import { BenchProvider, Hud, timeJump, useBench, useBenchSession } from "@chat-surface-bench/bench"
import { ChatColumn } from "@workspace/ui/components/chat-column"
import { ChatFrame } from "@workspace/ui/components/chat-frame"
import { Composer } from "@workspace/ui/components/composer"
import { MessageBubble } from "@workspace/ui/components/message-bubble"

function classSize(message: SeedMessage | undefined, bucket: WidthBucket): number {
  if (!message) return estimatePx("sm", bucket)
  return estimatePx(message.heightClass, bucket)
}

function OrbitStyleChat({ messages }: { messages: SeedMessage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [bucket, setBucket] = useState<WidthBucket>(800)
  const [streaming, setStreaming] = useState<{ id: string; text: string } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const { recordJump } = useBench()

  useLayoutEffect(() => {
    const el = scrollRef.current
    setScrollEl(el)
    if (!el) return
    const update = () => {
      setBucket(widthBucket(el.clientWidth))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      observer.disconnect()
    }
  }, [])

  useBenchSession({
    root: scrollEl,
    scroll: scrollEl,
    messageCount: messages.length,
  })

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollEl,
    estimateSize: (index) => classSize(messages[index], bucket),
    getItemKey: (index) => messages[index]?.id ?? index,
    enabled: scrollEl !== null,
    useFlushSync: false,
  })

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
      appId="orbit-style"
      title="orbit-style"
      implementsList={[
        "tanstack virtualizer with height-class estimateSize",
        "fixed row heights (xs–xl × width bucket)",
        "container resize for width bucket only",
      ]}
      doesNotList={[
        "measureElement",
        "ResizeObserver per row",
        "measured height cache",
        "server index",
      ]}
      cacheLabel="n/a"
      onJumpTo={onJumpTo}
      onStreamLast={onStreamLast}
      hud={<Hud />}
    >
      <ChatColumn scrollRef={scrollRef} composer={<Composer onSend={() => undefined} />}>
        <div
          data-chat-list=""
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
                data-height-class={message.heightClass}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${row.size}px`,
                  overflow: "hidden",
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

export function OrbitStyleApp() {
  const messages = useMemo(() => generateMessages(), [])
  return (
    <BenchProvider appId="orbit-style" cache="n/a">
      <OrbitStyleChat messages={messages} />
    </BenchProvider>
  )
}
