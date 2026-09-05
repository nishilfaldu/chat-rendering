"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react"
import { widthBucket, type WidthBucket } from "@chat-surface-bench/seed"
import { CHAT_PIN_THRESHOLD_PX } from "@workspace/ui/hooks/use-stick-to-bottom"

export type ReadingAnchor = {
  rowIndex: number
  offsetWithinRow: number
  pinned: boolean
}

// Reconcile against the mounted row after width-dependent measurements commit.
// User input always wins over this short restoration window.
export function settleReadingAnchor(
  element: HTMLElement,
  anchor: ReadingAnchor,
  reveal?: () => void
): () => void {
  let frame = 0
  let remaining = 12
  let cancelled = false
  const stop = () => {
    cancelled = true
    cancelAnimationFrame(frame)
  }
  const events = ["wheel", "pointerdown", "touchstart", "keydown"] as const
  events.forEach((event) =>
    element.addEventListener(event, stop, { passive: true })
  )
  const cleanup = () => {
    stop()
    events.forEach((event) => element.removeEventListener(event, stop))
  }
  const tick = () => {
    if (cancelled) return
    if (anchor.pinned) element.scrollTop = element.scrollHeight
    else {
      const row = element.querySelector<HTMLElement>(
        `[data-index="${anchor.rowIndex}"]`
      )
      if (row) {
        const delta =
          row.getBoundingClientRect().top -
          element.getBoundingClientRect().top +
          anchor.offsetWithinRow
        if (Math.abs(delta) > 0.5) element.scrollTop += delta
      } else reveal?.()
    }
    if (--remaining > 0) frame = requestAnimationFrame(tick)
    else cleanup()
  }
  frame = requestAnimationFrame(tick)
  return cleanup
}

export function useWidthBucket(
  element: HTMLElement | null,
  beforeChange?: (next: WidthBucket, previous: WidthBucket) => void
): WidthBucket {
  const [bucket, setBucket] = useState<WidthBucket>(() => widthBucket(800))
  const bucketRef = useRef(bucket)
  const beforeChangeRef = useRef(beforeChange)

  useLayoutEffect(() => {
    bucketRef.current = bucket
    beforeChangeRef.current = beforeChange
  }, [beforeChange, bucket])

  useLayoutEffect(() => {
    if (!element) return
    const update = () => {
      const next = widthBucket(element.clientWidth)
      const previous = bucketRef.current
      if (next === previous) return
      beforeChangeRef.current?.(next, previous)
      bucketRef.current = next
      setBucket(next)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return bucket
}

export function useReadingAnchor(element: HTMLElement | null): {
  anchor: MutableRefObject<ReadingAnchor | null>
  capture: () => ReadingAnchor | null
} {
  const anchor = useRef<ReadingAnchor | null>(null)
  const capture = useCallback(() => {
    if (!element) return null
    const scrollRect = element.getBoundingClientRect()
    const visibleRow = [
      ...element.querySelectorAll<HTMLElement>("[data-index]"),
    ]
      .map((row) => ({ row, rect: row.getBoundingClientRect() }))
      .filter(
        ({ rect }) =>
          rect.bottom > scrollRect.top + 1 && rect.top < scrollRect.bottom
      )
      .sort((a, b) => a.rect.top - b.rect.top)[0]
    if (!visibleRow) return anchor.current
    const rowIndex = Number(visibleRow.row.dataset.index)
    if (!Number.isFinite(rowIndex)) return anchor.current
    const next = {
      rowIndex,
      offsetWithinRow: Math.max(0, scrollRect.top - visibleRow.rect.top),
      pinned:
        element.scrollHeight - element.scrollTop - element.clientHeight <=
        CHAT_PIN_THRESHOLD_PX,
    }
    anchor.current = next
    return next
  }, [element])

  useEffect(() => {
    if (!element) return
    capture()
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      // Scroll listeners can run before the virtual window has committed.
      const width = element.clientWidth
      frame = requestAnimationFrame(() => {
        if (element.clientWidth === width) capture()
      })
    }
    element.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener("scroll", onScroll)
    }
  }, [capture, element])

  return { anchor, capture }
}

export function useSettledMeasurement<T>(
  persist: (value: T) => void | Promise<void>,
  delayMs = 500
): (key: string, value: T) => void {
  const persistRef = useRef(persist)
  const timers = useRef(new Map<string, number>())

  useLayoutEffect(() => {
    persistRef.current = persist
  }, [persist])

  useEffect(() => {
    const active = timers.current
    return () => {
      for (const timer of active.values()) window.clearTimeout(timer)
      active.clear()
    }
  }, [])

  return useCallback(
    (key: string, value: T) => {
      const previous = timers.current.get(key)
      if (previous !== undefined) window.clearTimeout(previous)
      const timer = window.setTimeout(() => {
        timers.current.delete(key)
        void persistRef.current(value)
      }, delayMs)
      timers.current.set(key, timer)
    },
    [delayMs]
  )
}
