"use client"

import { useCallback, useLayoutEffect, useRef } from "react"
import { useBench } from "@/lib/bench"

import { useBeforeWidthChange } from "./chat-runtime"
import {
  useReadingAnchor,
  type ReadingAnchor,
} from "./geometry-hooks"

export function useHeightCorrection(): (
  key: string,
  actual: number,
  expected: number
) => boolean {
  const last = useRef(new Map<string, number>())
  const { recordCorrection } = useBench()
  return useCallback(
    (key, actual, expected) => {
      if (Math.abs(actual - expected) <= 0.5) return false
      if (last.current.get(key) === actual) return false
      last.current.set(key, actual)
      recordCorrection(actual - expected)
      return true
    },
    [recordCorrection]
  )
}

export function useResizeRestore({
  scrollElement,
  restoreKey,
  enabled = true,
  fallback,
  restore,
}: {
  scrollElement: HTMLElement | null
  restoreKey: unknown
  enabled?: boolean
  fallback?: () => ReadingAnchor | null
  restore: (anchor: ReadingAnchor | null) => (() => void) | void
}): void {
  const { capture, anchor } = useReadingAnchor(scrollElement)
  const pending = useRef<ReadingAnchor | null>(null)
  const restoreRef = useRef(restore)
  const fallbackRef = useRef(fallback)

  useLayoutEffect(() => {
    restoreRef.current = restore
    fallbackRef.current = fallback
  }, [fallback, restore])

  useBeforeWidthChange(() => {
    pending.current =
      anchor.current ?? capture() ?? fallbackRef.current?.() ?? null
  })

  useLayoutEffect(() => {
    if (!enabled || !scrollElement) return
    const saved = pending.current
    pending.current = null
    return restoreRef.current(saved) ?? undefined
  }, [enabled, restoreKey, scrollElement])
}
