"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { widthBucket, type WidthBucket } from "@chat-surface-bench/seed"
import { useBench } from "@chat-surface-bench/bench"
import { CHAT_PIN_THRESHOLD_PX } from "@workspace/ui/hooks/use-stick-to-bottom"

import type {
  BucketTable,
  HtmlIndexedMessage,
  MarkdownIndexedMessage,
  ServerChatIndex,
} from "@/lib/build-index"

import { useBeforeWidthChange, useChatRuntime } from "./chat-runtime"
import {
  useReadingAnchor,
  useSettledMeasurement,
  settleReadingAnchor,
  type ReadingAnchor,
} from "./geometry-hooks"
import { useVirtualChat } from "./use-virtual-chat"
import { VirtualRows } from "./virtual-message-surface"

export type IndexedMessage = MarkdownIndexedMessage | HtmlIndexedMessage

const subscribeToHydration = () => () => undefined

type PendingServerMeasurement = {
  rowIndex: number
  px: number
  bucket: WidthBucket
}

function rowAtOffset(table: BucketTable, offset: number): number {
  let low = 0
  let high = table.offsets.length - 1
  while (low <= high) {
    const middle = (low + high) >> 1
    const start = table.offsets[middle] ?? 0
    const end = start + (table.sizes[middle] ?? 0)
    if (offset < start) high = middle - 1
    else if (offset >= end) low = middle + 1
    else return middle
  }
  return Math.min(Math.max(low, 0), Math.max(table.offsets.length - 1, 0))
}

export function ServerGeometrySurface<Message extends IndexedMessage>({
  messages,
  index,
  initialWindowStart,
  persistMeasurements,
  contentReady,
  prepareContent,
  observeContent,
  renderMessage,
}: {
  messages: Message[]
  index: ServerChatIndex
  initialWindowStart: number
  persistMeasurements: boolean
  contentReady?: (message: Message) => boolean
  prepareContent?: (messages: Message[]) => Promise<void>
  observeContent?: (messages: Message[]) => void
  renderMessage: (
    message: Message,
    streamingText: string | undefined
  ) => ReactNode
}) {
  const {
    scrollElement,
    scrollToOffset,
    streaming,
    widthBucket: bucket,
  } = useChatRuntime()
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  )
  const bucketRef = useRef(bucket)
  const pendingResize = useRef<ReadingAnchor | null>(null)
  const lastCorrections = useRef(new Map<string, number>())
  const { recordCorrection } = useBench()
  const { capture, anchor } = useReadingAnchor(scrollElement)
  const fallbackTable = index.buckets[widthBucket(800)]
  if (!fallbackTable) {
    throw new Error("server height index has no default width bucket")
  }
  const table = index.buckets[bucket] ?? fallbackTable

  useLayoutEffect(() => {
    bucketRef.current = bucket
  }, [bucket])

  const captureBeforeResize = useCallback(() => {
    if (!scrollElement) return
    const captured = anchor.current ?? capture()
    pendingResize.current = captured ?? {
      rowIndex: rowAtOffset(table, scrollElement.scrollTop),
      offsetWithinRow:
        scrollElement.scrollTop -
        (table.offsets[rowAtOffset(table, scrollElement.scrollTop)] ?? 0),
      pinned:
        scrollElement.scrollHeight -
          scrollElement.scrollTop -
          scrollElement.clientHeight <=
        CHAT_PIN_THRESHOLD_PX,
    }
  }, [anchor, capture, scrollElement, table])
  useBeforeWidthChange(captureBeforeResize)

  const persistSettled = useSettledMeasurement<PendingServerMeasurement>(
    async ({ rowIndex, px, bucket: measuredBucket }) => {
      if (!persistMeasurements || bucketRef.current !== measuredBucket) return
      const message = messages[rowIndex]
      if (!message) return
      await fetch("/api/heights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messageId: message.id,
          widthBucket: measuredBucket,
          contentHash: message.contentHash,
          px,
        }),
      })
    }
  )

  const prepareJump = useCallback(
    async (rowIndex: number) => {
      await prepareContent?.(
        messages.slice(
          Math.max(0, rowIndex - 8),
          Math.min(messages.length, rowIndex + 24)
        )
      )
    },
    [messages, prepareContent]
  )
  const virtual = useVirtualChat({
    messages,
    estimateSize: (rowIndex) => table.sizes[rowIndex] ?? 0,
    measureElement: (element, entry) => {
      const rowIndex = Number(element.getAttribute("data-index"))
      const measuredBucket = scrollElement
        ? widthBucket(scrollElement.clientWidth)
        : bucket
      const measuredTable = index.buckets[measuredBucket] ?? table
      const cached = measuredTable.sizes[rowIndex] ?? 0
      if (entry === undefined && cached > 0) return cached
      const message = messages[rowIndex]
      if (!message || (contentReady && !contentReady(message))) return cached
      const actual = element.getBoundingClientRect().height
      if (!Number.isFinite(actual) || actual <= 0) return cached
      if (entry !== undefined && Math.abs(actual - cached) > 0.5) {
        const correctionKey = `${measuredBucket}:${message.id}`
        if (lastCorrections.current.get(correctionKey) !== actual) {
          lastCorrections.current.set(correctionKey, actual)
          recordCorrection(actual - cached)
        }
        persistSettled(correctionKey, {
          rowIndex,
          px: actual,
          bucket: measuredBucket,
        })
      }
      return actual
    },
    enabled: hydrated && scrollElement !== null,
    initialOffset: () => table.total,
    overscan: 8,
    prepareJump: prepareContent ? prepareJump : undefined,
  })
  const { items: visibleItems, measure, measureElement, totalSize } = virtual

  useLayoutEffect(() => {
    if (!hydrated || !scrollElement || messages.length === 0) return
    measure()
    const resize = pendingResize.current
    pendingResize.current = null
    if (!resize) return
    const restoredTop = resize.pinned
      ? table.total
      : (table.offsets[resize.rowIndex] ?? 0) + resize.offsetWithinRow
    scrollToOffset(restoredTop)
    return settleReadingAnchor(scrollElement, resize, () =>
      scrollToOffset(restoredTop)
    )
  }, [
    bucket,
    hydrated,
    measure,
    messages.length,
    scrollElement,
    scrollToOffset,
    table,
  ])

  useEffect(() => {
    if (!hydrated) return
    observeContent?.(
      visibleItems
        .map((item) => messages[item.index])
        .filter((message): message is Message => message !== undefined)
    )
  }, [hydrated, messages, observeContent, visibleItems])

  if (!hydrated) {
    return (
      <div
        data-chat-list=""
        data-server-initial-window=""
        className="flex min-h-full flex-col justify-end"
      >
        {messages
          .slice(initialWindowStart)
          .map((message) => renderMessage(message, undefined))}
      </div>
    )
  }

  return (
    <VirtualRows
      totalSize={totalSize}
      items={visibleItems}
      messages={messages}
      measureElement={measureElement}
      rowStyle={(row) => {
        const message = messages[row.index]
        return message && contentReady && !contentReady(message)
          ? { minHeight: row.size }
          : undefined
      }}
      renderMessage={(message, _rowIndex, streamingThis) =>
        renderMessage(message, streamingThis ? streaming?.text : undefined)
      }
    />
  )
}
