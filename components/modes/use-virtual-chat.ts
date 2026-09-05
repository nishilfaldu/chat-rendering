"use client"

import { useCallback, useMemo } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"

import {
  useChatRuntime,
  useChatRuntimeController,
  type ChatRuntimeController,
} from "./chat-runtime"

export type VirtualMeasureElement = (
  element: Element,
  entry: ResizeObserverEntry | undefined
) => number

export function useVirtualChat<Message extends { id: string }>({
  messages,
  estimateSize,
  measureElement: measureByPolicy,
  initialOffset,
  overscan,
  enabled = true,
  prepareJump,
}: {
  messages: readonly Message[]
  estimateSize: (rowIndex: number) => number
  measureElement?: VirtualMeasureElement
  initialOffset?: number | (() => number)
  overscan?: number
  enabled?: boolean
  prepareJump?: (rowIndex: number) => Promise<void>
}) {
  const { scrollElement, streaming } = useChatRuntime()
  const active = enabled && scrollElement !== null

  // TanStack Virtual intentionally returns stateful functions that React Compiler cannot memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollElement,
    estimateSize,
    measureElement: (element, entry) => {
      const rowIndex = Number(element.getAttribute("data-index"))
      if (messages[rowIndex]?.id === streaming?.id) {
        const actual = element.getBoundingClientRect().height
        if (Number.isFinite(actual) && actual > 0) return actual
      }
      return measureByPolicy?.(element, entry) ?? estimateSize(rowIndex)
    },
    enabled: active,
    initialOffset,
    overscan,
    // Commit the new window during the scroll event, before the next paint.
    useFlushSync: true,
    getItemKey: (rowIndex) => messages[rowIndex]?.id ?? rowIndex,
  })

  // Ref callbacks run during React's commit. Measuring a new row can adjust
  // the scroll offset and synchronously notify React, so defer that work until
  // the commit finishes. Microtasks still run before the browser paints.
  const measureElement = useCallback(
    (element: Element | null) => {
      if (!element) {
        virtualizer.measureElement(null)
        return
      }
      queueMicrotask(() => {
        if (element.isConnected && scrollElement?.contains(element)) {
          virtualizer.measureElement(element)
        }
      })
    },
    [virtualizer, scrollElement]
  )

  const scrollToIndex = useCallback(
    (rowIndex: number, align: "start" | "end") =>
      virtualizer.scrollToIndex(rowIndex, { align }),
    [virtualizer]
  )
  const controller = useMemo<ChatRuntimeController>(
    () => ({ kind: "virtual", scrollToIndex, prepareJump }),
    [prepareJump, scrollToIndex]
  )
  useChatRuntimeController(controller, active)

  return {
    items: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
    measureElement,
    measure: virtualizer.measure,
    scrollToIndex,
  }
}
