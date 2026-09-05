"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  DATASET_VERSION,
  LAYOUT_VERSION,
  RENDERER_VERSION,
  estimatePx,
  hashContent,
  type SeedMessage,
  type WidthBucket,
} from "@/lib/seed"
import { BenchProvider, useBench } from "@/lib/bench"
import { MessageList } from "@/components/message-list"

import {
  clearOrbitRows,
  loadOrbitHtml,
  loadOrbitRows,
  orbitCacheKey,
  putOrbitRow,
  type OrbitHeightRow,
} from "@/lib/orbit-cache"

import {
  ChatRuntime,
  useBeforeWidthChange,
  useChatRuntime,
} from "./chat-runtime"
import {
  useReadingAnchor,
  useSettledMeasurement,
  settleReadingAnchor,
  type ReadingAnchor,
} from "./geometry-hooks"
import { useVirtualChat } from "./use-virtual-chat"
import { VirtualMessageSurface } from "./virtual-message-surface"

const INITIAL_PREVIEW_ROWS = 24
const HTML_MEMORY_LIMIT = 2_000

type PendingOrbitMeasurement = {
  bucket: WidthBucket
  element: Element
  height: number
  message: SeedMessage
}

function OrbitCacheSurface({ messages }: { messages: SeedMessage[] }) {
  const {
    adjustScrollBy,
    scrollElement,
    streaming,
    widthBucket: bucket,
  } = useChatRuntime()
  const [loadedBucket, setLoadedBucket] = useState<WidthBucket | null>(null)
  const [cache, setLocalCache] = useState<Map<string, OrbitHeightRow>>(
    () => new Map()
  )
  const [htmlCache, setHtmlCache] = useState<Map<number, string>>(
    () => new Map()
  )
  const lastCorrections = useRef(new Map<string, number>())
  const pendingResize = useRef<ReadingAnchor | null>(null)
  const { recordCorrection, setCache } = useBench()
  const sessionId = messages[0]?.sessionId ?? ""
  const cacheReady = loadedBucket === bucket
  const hasLoadedCache = loadedBucket !== null
  const activeCache = useMemo(
    () => (cacheReady ? cache : new Map<string, OrbitHeightRow>()),
    [cache, cacheReady]
  )
  const { capture, anchor } = useReadingAnchor(scrollElement)
  const captureBeforeResize = () => {
    pendingResize.current = anchor.current ?? capture()
  }
  useBeforeWidthChange(captureBeforeResize)

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      loadOrbitRows(sessionId, bucket),
      loadOrbitHtml(bucket),
    ]).then(([rows, html]) => {
      if (cancelled) return
      const valid = new Map<string, OrbitHeightRow>()
      for (const message of messages) {
        const row = rows.get(message.id)
        if (row?.contentHash === hashContent(message.text)) {
          valid.set(message.id, row)
        }
      }
      setLocalCache(valid)
      setHtmlCache(html)
      setCache(
        valid.size === 0
          ? "cold"
          : valid.size === messages.length
            ? "warm"
            : "partial"
      )
      setLoadedBucket(bucket)
    })
    return () => {
      cancelled = true
    }
  }, [bucket, messages, sessionId, setCache])

  const persistSettled = useSettledMeasurement<PendingOrbitMeasurement>(
    async ({ bucket: measuredBucket, element, height, message }) => {
      if (!element.isConnected || streaming?.id === message.id) return
      const body = element.querySelector<HTMLElement>("[data-message-body]")
      if (!body || body.innerHTML.length === 0) return
      const contentHash = hashContent(message.text)
      const row: OrbitHeightRow = {
        key: orbitCacheKey({
          sessionId: message.sessionId,
          messageId: message.id,
          widthBucket: measuredBucket,
          contentHash,
        }),
        sessionId: message.sessionId,
        messageId: message.id,
        widthBucket: measuredBucket,
        contentHash,
        datasetVersion: DATASET_VERSION,
        rendererVersion: RENDERER_VERSION,
        layoutVersion: LAYOUT_VERSION,
        height,
        settledAt: Date.now(),
      }
      await putOrbitRow(row, body.innerHTML)
      if (measuredBucket !== bucket) return
      setLocalCache((previous) => {
        const next = new Map(previous)
        next.set(message.id, row)
        setCache(next.size === messages.length ? "warm" : "partial")
        return next
      })
      setHtmlCache((previous) => {
        const next = new Map(previous)
        next.delete(contentHash)
        next.set(contentHash, body.innerHTML)
        while (next.size > HTML_MEMORY_LIMIT) {
          const oldest = next.keys().next().value as number | undefined
          if (oldest === undefined) break
          next.delete(oldest)
        }
        return next
      })
    }
  )

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
        if (Math.abs(actual - expected) > 0.5) {
          const correctionKey = `${bucket}:${message.id}`
          if (lastCorrections.current.get(correctionKey) !== actual) {
            lastCorrections.current.set(correctionKey, actual)
            recordCorrection(actual - expected)
          }
        }
        persistSettled(correctionKeyFor(bucket, message.id), {
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

  useLayoutEffect(() => {
    const resize = pendingResize.current
    if (!cacheReady || !scrollElement || !resize) return
    pendingResize.current = null
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
  }, [
    adjustScrollBy,
    bucket,
    cacheReady,
    messages.length,
    measure,
    scrollElement,
    scrollToIndex,
  ])

  if (!hasLoadedCache) {
    return <MessageList messages={messages.slice(-INITIAL_PREVIEW_ROWS)} />
  }

  return (
    <VirtualMessageSurface
      totalSize={totalSize}
      items={items}
      messages={messages}
      measureElement={measureElement}
      contentFor={(message) => {
        const rendered = activeCache.has(message.id)
          ? htmlCache.get(hashContent(message.text))
          : undefined
        return rendered === undefined
          ? { kind: "markdown", markdown: message.text }
          : { kind: "html", html: rendered }
      }}
    />
  )
}

function correctionKeyFor(bucket: WidthBucket, messageId: string): string {
  return `${bucket}:${messageId}`
}

export function OrbitCacheApp({
  messages,
  serverQueryMs = null,
}: {
  messages: SeedMessage[]
  serverQueryMs?: number | null
}) {
  const [epoch, setEpoch] = useState(0)
  const reset = async () => {
    await clearOrbitRows()
    setEpoch((value) => value + 1)
  }
  return (
    <BenchProvider
      key={epoch}
      appId="orbit"
      cache="cold"
      serverQueryMs={serverQueryMs}
    >
      <ChatRuntime lastMessage={messages.at(-1) ?? null} onCacheReset={reset}>
        <OrbitCacheSurface messages={messages} />
      </ChatRuntime>
    </BenchProvider>
  )
}
