"use client"

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import { flushSync } from "react-dom"

const DEFAULT_MEMORY_LIMIT = 160

function mergeBounded(
  previous: Map<string, string>,
  incoming: Record<string, string>,
  limit: number
): Map<string, string> {
  const next = new Map(previous)
  for (const [id, html] of Object.entries(incoming)) {
    next.delete(id)
    next.set(id, html)
  }
  while (next.size > limit) {
    const oldest = next.keys().next().value as string | undefined
    if (oldest === undefined) break
    next.delete(oldest)
  }
  return next
}

export function usePagedHtml({
  initial,
  enabled,
  onStats,
  memoryLimit = DEFAULT_MEMORY_LIMIT,
}: {
  initial: ReadonlyMap<string, string>
  enabled: boolean
  onStats: (hits: number, misses: number) => void
  memoryLimit?: number
}) {
  const [htmlById, setHtmlById] = useState(() => new Map(initial))
  const htmlRef = useRef(htmlById)
  const inflight = useRef(new Map<string, Promise<void>>())
  const stats = useRef({ hits: 0, misses: 0, observed: new Set<string>() })
  useLayoutEffect(() => {
    htmlRef.current = htmlById
  }, [htmlById])

  const ensure = useCallback(
    async (ids: string[]) => {
      if (!enabled) return
      const missing = [...new Set(ids)].filter(
        (id) => !htmlRef.current.has(id) && !inflight.current.has(id)
      )
      if (missing.length === 0) {
        await Promise.all(
          ids.map((id) => inflight.current.get(id)).filter(Boolean)
        )
        return
      }
      const request = fetch(
        `/api/html?ids=${missing.map(encodeURIComponent).join(",")}`
      )
        .then(async (response) => {
          if (!response.ok) return { html: {} as Record<string, string> }
          return (await response.json()) as { html: Record<string, string> }
        })
        .then((body) => {
          const next = mergeBounded(htmlRef.current, body.html, memoryLimit)
          htmlRef.current = next
          flushSync(() => setHtmlById(next))
        })
        .finally(() => {
          for (const id of missing) inflight.current.delete(id)
        })
      for (const id of missing) inflight.current.set(id, request)
      await request
    },
    [enabled, memoryLimit]
  )

  const observe = useCallback(
    (ids: string[]) => {
      if (!enabled) return
      let changed = false
      for (const id of ids) {
        if (stats.current.observed.has(id)) continue
        stats.current.observed.add(id)
        if (htmlRef.current.has(id)) stats.current.hits += 1
        else stats.current.misses += 1
        changed = true
      }
      if (changed) onStats(stats.current.hits, stats.current.misses)
      void ensure(ids)
    },
    [enabled, ensure, onStats]
  )

  const get = useCallback((id: string) => htmlRef.current.get(id), [])
  const has = useCallback((id: string) => htmlRef.current.has(id), [])

  return useMemo(
    () => ({ htmlById, ensure, observe, get, has }),
    [ensure, get, has, htmlById, observe]
  )
}
