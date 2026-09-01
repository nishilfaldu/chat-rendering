"use client"

import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
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
import { MessageMapRail } from "@workspace/ui/components/message-map-rail"

import type { BucketTable, ServerChatIndex } from "@/lib/build-index"

function ServerIndexChat({
  messages,
  index,
}: {
  messages: SeedMessage[]
  index: ServerChatIndex
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [bucket, setBucket] = useState<WidthBucket>(800)
  const [streaming, setStreaming] = useState<{ id: string; text: string } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const { recordJump } = useBench()
  const table: BucketTable = index.buckets[bucket]

  useLayoutEffect(() => {
    setScrollEl(scrollRef.current)
  }, [])

  useLayoutEffect(() => {
    if (!scrollEl) return
    const syncBucket = () => {
      setBucket(widthBucket(scrollEl.clientWidth))
    }
    syncBucket()
    const observer = new ResizeObserver(syncBucket)
    observer.observe(scrollEl)
    return () => observer.disconnect()
  }, [scrollEl])

  useBenchSession({
    root: scrollEl,
    scroll: scrollEl,
    messageCount: messages.length,
  })

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollEl,
    estimateSize: (rowIndex) => table.sizes[rowIndex] ?? 0,
    enabled: scrollEl !== null,
    overscan: 8,
    useFlushSync: false,
    getItemKey: (rowIndex) => messages[rowIndex]?.id ?? rowIndex,
  })

  const railItems = useMemo(
    () =>
      messages.map((message, rowIndex) => ({
        id: message.id,
        heightClass: message.heightClass,
        measuredPx: table.sizes[rowIndex] ?? null,
      })),
    [messages, table],
  )

  async function onJumpTo(n: number) {
    const rowIndex = Math.min(Math.max(n, 0), messages.length - 1)
    const ms = await timeJump(() => {
      if (!scrollEl) return
      scrollEl.scrollTop = table.offsets[rowIndex] ?? 0
    })
    recordJump(rowIndex, ms)
  }

  async function onStreamLast() {
    const lastIndex = messages.length - 1
    const last = messages[lastIndex]
    if (!last || !scrollEl) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    scrollEl.scrollTop = table.offsets[lastIndex] ?? 0
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
      appId="server-index"
      title="server-index"
      implementsList={[
        "precomputed server offset/height index",
        "visible-window rows from the index",
        "jump-to-n via offset table",
        "width-bucket tables from seed estimates",
      ]}
      doesNotList={[
        "row measurement",
        "ResizeObserver per row",
        "all 10,000 messages in the DOM",
      ]}
      cacheLabel="warm"
      onJumpTo={onJumpTo}
      onStreamLast={onStreamLast}
      hud={<Hud />}
      rail={
        <MessageMapRail
          items={railItems}
          bucket={bucket}
          onJump={(id) => {
            const rowIndex = messages.findIndex((message) => message.id === id)
            if (rowIndex >= 0) void onJumpTo(rowIndex)
          }}
        />
      }
    >
      <ChatColumn scrollRef={scrollRef} composer={<Composer onSend={() => undefined} />}>
        <div
          style={{
            height: `${table.total}px`,
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
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${table.sizes[row.index] ?? row.size}px`,
                  transform: `translateY(${table.offsets[row.index] ?? row.start}px)`,
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

export function ServerIndexApp({ index }: { index: ServerChatIndex }) {
  const messages = useMemo(() => generateMessages(), [])
  return (
    <BenchProvider appId="server-index" cache="warm">
      <ServerIndexChat messages={messages} index={index} />
    </BenchProvider>
  )
}
