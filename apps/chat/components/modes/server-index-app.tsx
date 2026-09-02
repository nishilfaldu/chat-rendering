"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  replayStream,
  widthBucket,
  type WidthBucket,
} from "@chat-surface-bench/seed"
import { BenchProvider, Hud, timeJump, useBench, useBenchSession } from "@chat-surface-bench/bench"
import { ChatColumn } from "@workspace/ui/components/chat-column"
import { ChatFrame } from "@workspace/ui/components/chat-frame"
import { Composer } from "@workspace/ui/components/composer"
import { MessageBubble } from "@workspace/ui/components/message-bubble"
import { MessageMapRail } from "@workspace/ui/components/message-map-rail"
import { useStickToBottom } from "@workspace/ui/hooks/use-stick-to-bottom"

import type { BucketTable, ServerIndexPayload } from "@/lib/build-index"

function ServerIndexChat({ payload }: { payload: ServerIndexPayload }) {
  const { messages, index, initialHtml, warm } = payload
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [bucket, setBucket] = useState<WidthBucket>(800)
  const [streaming, setStreaming] = useState<{ id: string; text: string } | null>(null)
  const [liveLastPx, setLiveLastPx] = useState<number | null>(null)
  const [htmlById, setHtmlById] = useState(() => new Map(Object.entries(initialHtml)))
  const htmlRef = useRef(htmlById)
  htmlRef.current = htmlById
  const inflight = useRef(new Set<string>())
  const abortRef = useRef<AbortController | null>(null)
  const { recordJump, markFirstPaint } = useBench()
  const { pinAndStick, stickIfPinned, release } = useStickToBottom(scrollEl)
  const table: BucketTable = index.buckets[bucket]
  const lastIndex = messages.length - 1

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
    estimateSize: (rowIndex) => {
      if (rowIndex === lastIndex && liveLastPx !== null) return liveLastPx
      return table.sizes[rowIndex] ?? 0
    },
    enabled: scrollEl !== null,
    overscan: 8,
    useFlushSync: false,
    getItemKey: (rowIndex) => messages[rowIndex]?.id ?? rowIndex,
  })

  const visibleItems = virtualizer.getVirtualItems()

  useEffect(() => {
    const missing: string[] = []
    for (const row of visibleItems) {
      const message = messages[row.index]
      if (!message) continue
      if (htmlRef.current.has(message.id) || inflight.current.has(message.id)) continue
      missing.push(message.id)
    }
    if (missing.length === 0) return
    for (const id of missing) inflight.current.add(id)
    void fetch(`/api/html?ids=${missing.map(encodeURIComponent).join(",")}`)
      .then(async (response) => {
        if (!response.ok) return { html: {} as Record<string, string> }
        return (await response.json()) as { html: Record<string, string> }
      })
      .then((body) => {
        setHtmlById((prev) => {
          const next = new Map(prev)
          for (const [id, html] of Object.entries(body.html)) {
            next.set(id, html)
          }
          return next
        })
      })
      .finally(() => {
        for (const id of missing) inflight.current.delete(id)
      })
  }, [visibleItems, messages])

  useLayoutEffect(() => {
    if (!scrollEl || messages.length === 0) return
    scrollEl.scrollTop = (table.offsets[lastIndex] ?? 0) + (table.sizes[lastIndex] ?? 0)
    pinAndStick()
    markFirstPaint()
  }, [scrollEl, messages.length, lastIndex, table, pinAndStick, markFirstPaint])

  const railItems = useMemo(
    () =>
      messages.map((message, rowIndex) => ({
        id: message.id,
        heightClass: message.heightClass,
        measuredPx: table.sizes[rowIndex] ?? null,
      })),
    [messages, table],
  )

  async function ensureHtml(ids: string[]): Promise<void> {
    const missing = ids.filter((id) => !htmlRef.current.has(id))
    if (missing.length === 0) return
    const response = await fetch(`/api/html?ids=${missing.map(encodeURIComponent).join(",")}`)
    if (!response.ok) return
    const body = (await response.json()) as { html: Record<string, string> }
    const next = new Map(htmlRef.current)
    for (const [id, html] of Object.entries(body.html)) {
      next.set(id, html)
    }
    htmlRef.current = next
    setHtmlById(next)
  }

  async function onJumpTo(n: number) {
    const rowIndex = Math.min(Math.max(n, 0), lastIndex)
    release()
    const windowIds = messages
      .slice(Math.max(0, rowIndex - 8), Math.min(messages.length, rowIndex + 24))
      .map((message) => message.id)
    const ms = await timeJump(async () => {
      await ensureHtml(windowIds)
      if (!scrollEl) return
      scrollEl.scrollTop = table.offsets[rowIndex] ?? 0
    })
    recordJump(rowIndex, ms)
  }

  async function onStreamLast() {
    const last = messages[lastIndex]
    if (!last || !scrollEl) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    pinAndStick()
    scrollEl.scrollTop = (table.offsets[lastIndex] ?? 0) + (table.sizes[lastIndex] ?? 0)
    setStreaming({ id: last.id, text: "" })
    await replayStream({
      text: last.text,
      signal: ac.signal,
      onToken: (text) => {
        setStreaming({ id: last.id, text })
        requestAnimationFrame(() => {
          const node = scrollEl.querySelector(`[data-message-id="${CSS.escape(last.id)}"]`)
          if (node) setLiveLastPx(node.getBoundingClientRect().height)
          stickIfPinned()
        })
      },
    })
    if (!ac.signal.aborted) {
      setStreaming(null)
      setLiveLastPx(null)
      stickIfPinned()
    }
  }

  return (
    <ChatFrame
      appId="server-index"
      title="server-index"
      implementsList={[
        "sqlite-persisted per-width-bucket measured heights",
        "prerendered html for the visible window",
        "jump-to-n via measured offset table",
        "stick-to-bottom on load and while streaming",
      ]}
      doesNotList={[
        "client generateMessages()",
        "class-estimate sizes",
        "all 10,000 messages in the DOM",
      ]}
      cacheLabel={warm ? "warm" : "cold"}
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
            height: `${liveLastPx !== null ? table.total - (table.sizes[lastIndex] ?? 0) + liveLastPx : table.total}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {visibleItems.map((row) => {
            const message = messages[row.index]
            if (!message) return null
            const streamingThis = streaming?.id === message.id
            const top = table.offsets[row.index] ?? row.start
            const size =
              streamingThis && liveLastPx !== null ? liveLastPx : (table.sizes[row.index] ?? row.size)
            return (
              <div
                key={row.key}
                data-index={row.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${size}px`,
                  transform: `translateY(${top}px)`,
                }}
              >
                <MessageBubble
                  message={message}
                  html={streamingThis ? undefined : htmlById.get(message.id)}
                  streamingText={streamingThis ? streaming?.text : undefined}
                />
              </div>
            )
          })}
        </div>
      </ChatColumn>
    </ChatFrame>
  )
}

export function ServerIndexApp({ payload }: { payload: ServerIndexPayload }) {
  return (
    <BenchProvider appId="server-index" cache={payload.warm ? "warm" : "cold"}>
      <ServerIndexChat payload={payload} />
    </BenchProvider>
  )
}
