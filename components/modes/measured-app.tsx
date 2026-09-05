"use client"

import { useEffect, useRef, useState } from "react"
import type { SeedMessage } from "@/lib/seed"
import { BenchProvider, useBench } from "@/lib/bench"
import { MessageBubble } from "@/components/message-bubble"

import { ChatRuntime, useChatRuntime } from "./chat-runtime"
import { settleReadingAnchor } from "./geometry-hooks"
import { useHeightCorrection, useResizeRestore } from "./measurement-hooks"
import { useVirtualChat } from "./use-virtual-chat"
import { VirtualRows } from "./virtual-rows"

const FLAT_ESTIMATE = 80

function MeasuredSurface({ messages }: { messages: SeedMessage[] }) {
  const { scrollElement, widthBucket } = useChatRuntime()
  const measuredRows = useRef(new Map<number, number>())
  const ignoreInitialScroll = useRef(true)
  const { setCache, snapshot } = useBench()
  const noteCorrection = useHeightCorrection()

  const virtual = useVirtualChat({
    messages,
    estimateSize: () => FLAT_ESTIMATE,
    measureElement: (element) => {
      const rowIndex = Number(element.getAttribute("data-index"))
      const actual = element.getBoundingClientRect().height
      if (!Number.isFinite(actual) || actual <= 0) return FLAT_ESTIMATE
      const previous = measuredRows.current.get(rowIndex) ?? FLAT_ESTIMATE
      noteCorrection(`${widthBucket}:${rowIndex}`, actual, previous)
      measuredRows.current.set(rowIndex, actual)
      return actual
    },
    enabled: scrollElement !== null,
  })
  const { measure, scrollToIndex } = virtual

  useResizeRestore({
    scrollElement,
    restoreKey: widthBucket,
    restore: (saved) => {
      if (!saved || !scrollElement) return
      measuredRows.current.clear()
      measure()
      const reveal = () =>
        scrollToIndex(saved.rowIndex, saved.pinned ? "end" : "start")
      reveal()
      return settleReadingAnchor(scrollElement, saved, reveal)
    },
  })

  useEffect(() => {
    if (!scrollElement) return
    const timer = window.setTimeout(() => {
      ignoreInitialScroll.current = false
    }, 500)
    return () => window.clearTimeout(timer)
  }, [scrollElement])

  useEffect(() => {
    if (!scrollElement || snapshot.cache === "warm") return
    const onScroll = () => {
      if (!ignoreInitialScroll.current) setCache("partial")
    }
    scrollElement.addEventListener("scroll", onScroll, {
      passive: true,
      once: true,
    })
    return () => scrollElement.removeEventListener("scroll", onScroll)
  }, [scrollElement, setCache, snapshot.cache])

  return (
    <VirtualRows
      totalSize={virtual.totalSize}
      items={virtual.items}
      messages={messages}
      measureElement={virtual.measureElement}
      renderMessage={(message, _rowIndex, streamingText) => (
        <MessageBubble
          message={message}
          content={{ kind: "markdown", markdown: message.text }}
          streamingText={streamingText}
        />
      )}
    />
  )
}

export function MeasuredApp({
  messages,
  serverQueryMs = null,
}: {
  messages: SeedMessage[]
  serverQueryMs?: number | null
}) {
  const [epoch, setEpoch] = useState(0)
  return (
    <BenchProvider
      key={epoch}
      appId="measured"
      cache="cold"
      serverQueryMs={serverQueryMs}
    >
      <ChatRuntime
        lastMessage={messages.at(-1) ?? null}
        onCacheReset={() => setEpoch((value) => value + 1)}
      >
        <MeasuredSurface messages={messages} />
      </ChatRuntime>
    </BenchProvider>
  )
}
