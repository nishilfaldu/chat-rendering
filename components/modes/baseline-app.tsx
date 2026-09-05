"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { SeedMessage } from "@/lib/seed"
import { BenchProvider, useBench } from "@/lib/bench"

import {
  ChatRuntime,
  useChatRuntime,
  useBeforeWidthChange,
} from "./chat-runtime"
import {
  useReadingAnchor,
  settleReadingAnchor,
  type ReadingAnchor,
} from "./geometry-hooks"
import { useVirtualChat } from "./use-virtual-chat"
import {
  VirtualMessageSurface,
  markdownMessageContent,
} from "./virtual-message-surface"

const FLAT_ESTIMATE = 80

function BaselineSurface({ messages }: { messages: SeedMessage[] }) {
  const { scrollElement, widthBucket } = useChatRuntime()
  const { anchor, capture } = useReadingAnchor(scrollElement)
  const pendingResize = useRef<ReadingAnchor | null>(null)
  useBeforeWidthChange(() => {
    pendingResize.current = anchor.current ?? capture()
  })
  const measuredRows = useRef(new Map<number, number>())
  const ignoreInitialScroll = useRef(true)
  const { recordCorrection, setCache, snapshot } = useBench()

  const virtual = useVirtualChat({
    messages,
    estimateSize: () => FLAT_ESTIMATE,
    measureElement: (element) => {
      const rowIndex = Number(element.getAttribute("data-index"))
      const actual = element.getBoundingClientRect().height
      if (!Number.isFinite(actual) || actual <= 0) return FLAT_ESTIMATE
      const previous = measuredRows.current.get(rowIndex) ?? FLAT_ESTIMATE
      if (Math.abs(actual - previous) > 0.5) {
        recordCorrection(actual - previous)
      }
      measuredRows.current.set(rowIndex, actual)
      return actual
    },
    enabled: scrollElement !== null,
  })
  const { measure, scrollToIndex } = virtual
  useLayoutEffect(() => {
    const saved = pendingResize.current
    if (!saved || !scrollElement) return
    pendingResize.current = null
    measuredRows.current.clear()
    measure()
    const reveal = () =>
      scrollToIndex(saved.rowIndex, saved.pinned ? "end" : "start")
    reveal()
    return settleReadingAnchor(scrollElement, saved, reveal)
  }, [widthBucket, measure, scrollElement, scrollToIndex])

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
    <VirtualMessageSurface
      totalSize={virtual.totalSize}
      items={virtual.items}
      messages={messages}
      measureElement={virtual.measureElement}
      contentFor={markdownMessageContent}
    />
  )
}

export function BaselineApp({
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
      appId="baseline"
      cache="cold"
      serverQueryMs={serverQueryMs}
    >
      <ChatRuntime
        lastMessage={messages.at(-1) ?? null}
        onCacheReset={() => setEpoch((value) => value + 1)}
      >
        <BaselineSurface messages={messages} />
      </ChatRuntime>
    </BenchProvider>
  )
}
