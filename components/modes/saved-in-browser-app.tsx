"use client"

import { useMemo, useState } from "react"
import { estimatePx, hashContent, type SeedMessage } from "@/lib/seed"
import { BenchProvider } from "@/lib/bench"
import { MessageBubble } from "@/components/message-bubble"
import { MessageList } from "@/components/message-list"

import { clearBrowserCache } from "@/lib/browser-cache"

import { ChatRuntime, useChatRuntime } from "./chat-runtime"
import { settleReadingAnchor } from "./geometry-hooks"
import { useHeightCorrection, useResizeRestore } from "./measurement-hooks"
import { useBrowserMessageCache } from "./use-browser-cache"
import { useVirtualChat } from "./use-virtual-chat"
import { VirtualRows } from "./virtual-rows"

const INITIAL_PREVIEW_ROWS = 24

function SavedInBrowserSurface({ messages }: { messages: SeedMessage[] }) {
  const { adjustScrollBy, scrollElement } = useChatRuntime()
  const {
    bucket,
    cacheReady,
    hasLoadedCache,
    activeCache,
    htmlCache,
    persistSettled,
    streaming,
  } = useBrowserMessageCache(messages)
  const noteCorrection = useHeightCorrection()

  const initialOffset = useMemo(
    () =>
      messages.reduce((total, message) => {
        const cached = activeCache.get(message.id)
        return (
          total + (cached?.height ?? estimatePx(message.heightClass, bucket))
        )
      }, 0),
    [activeCache, bucket, messages]
  )

  const virtual = useVirtualChat({
    messages,
    estimateSize: (rowIndex) => {
      const message = messages[rowIndex]
      return (
        (message ? activeCache.get(message.id)?.height : undefined) ??
        estimatePx(message?.heightClass ?? "sm", bucket)
      )
    },
    measureElement: (element, entry) => {
      const rowIndex = Number(element.getAttribute("data-index"))
      const message = messages[rowIndex]
      const cached = message ? activeCache.get(message.id) : undefined
      if (entry === undefined && cached && cached.height > 0)
        return cached.height
      const actual = element.getBoundingClientRect().height
      if (!Number.isFinite(actual) || actual <= 0) {
        return (
          cached?.height ?? estimatePx(message?.heightClass ?? "sm", bucket)
        )
      }
      if (!message || message.id === streaming?.id) return actual
      if (entry !== undefined) {
        const expected =
          cached?.height ?? estimatePx(message.heightClass, bucket)
        const correctionKey = `${bucket}:${message.id}`
        noteCorrection(correctionKey, actual, expected)
        persistSettled(correctionKey, {
          bucket,
          element,
          height: actual,
          message,
        })
      }
      return actual
    },
    enabled: hasLoadedCache && scrollElement !== null,
    initialOffset: () => initialOffset,
    overscan: 8,
  })
  const { items, measureElement, measure, scrollToIndex, totalSize } = virtual

  useResizeRestore({
    scrollElement,
    restoreKey: bucket,
    enabled: cacheReady,
    restore: (resize) => {
      if (!resize || !scrollElement) return
      measure()
      const restore = () => {
        if (resize.pinned) {
          scrollToIndex(messages.length - 1, "end")
        } else {
          scrollToIndex(resize.rowIndex, "start")
          adjustScrollBy(resize.offsetWithinRow)
        }
      }
      restore()
      return settleReadingAnchor(scrollElement, resize, restore)
    },
  })

  if (!hasLoadedCache) {
    return <MessageList messages={messages.slice(-INITIAL_PREVIEW_ROWS)} />
  }

  return (
    <VirtualRows
      totalSize={totalSize}
      items={items}
      messages={messages}
      measureElement={measureElement}
      renderMessage={(message, _rowIndex, streamingText) => {
        const rendered = activeCache.has(message.id)
          ? htmlCache.get(hashContent(message.text))
          : undefined
        return (
          <MessageBubble
            message={message}
            content={
              rendered === undefined
                ? { kind: "markdown", markdown: message.text }
                : { kind: "html", html: rendered }
            }
            streamingText={streamingText}
          />
        )
      }}
    />
  )
}

export function SavedInBrowserApp({
  messages,
  serverQueryMs = null,
}: {
  messages: SeedMessage[]
  serverQueryMs?: number | null
}) {
  const [epoch, setEpoch] = useState(0)
  const reset = async () => {
    await clearBrowserCache()
    setEpoch((value) => value + 1)
  }
  return (
    <BenchProvider
      key={epoch}
      appId="saved-in-browser"
      cache="cold"
      serverQueryMs={serverQueryMs}
    >
      <ChatRuntime lastMessage={messages.at(-1) ?? null} onCacheReset={reset}>
        <SavedInBrowserSurface messages={messages} />
      </ChatRuntime>
    </BenchProvider>
  )
}
