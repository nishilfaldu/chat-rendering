"use client"

import { useEffect, useLayoutEffect, useMemo, useState } from "react"
import { hashContent, type SeedMessage, type WidthBucket } from "@/lib/seed"
import { useBench, type CacheLabel } from "@/lib/bench"

import {
  loadBrowserCacheHtml,
  loadBrowserCacheRows,
  browserCacheKey,
  putBrowserCacheRow,
  type BrowserCacheHeightRow,
} from "@/lib/browser-cache"

import { useChatRuntime } from "./chat-runtime"
import { useSettledMeasurement } from "./geometry-hooks"

const HTML_MEMORY_LIMIT = 2_000

type PendingBrowserMeasurement = {
  bucket: WidthBucket
  element: Element
  height: number
  message: SeedMessage
}

function cacheLabel(size: number, messageCount: number): CacheLabel {
  if (size === 0) return "cold"
  if (size === messageCount) return "warm"
  return "partial"
}

export function useBrowserMessageCache(messages: SeedMessage[]) {
  const { streaming, widthBucket: bucket } = useChatRuntime()
  const { setCache } = useBench()
  const [loadedBucket, setLoadedBucket] = useState<WidthBucket | null>(null)
  const [cache, setLocalCache] = useState<Map<string, BrowserCacheHeightRow>>(
    () => new Map()
  )
  const [htmlCache, setHtmlCache] = useState<Map<number, string>>(
    () => new Map()
  )
  const sessionId = messages[0]?.sessionId ?? ""
  const cacheReady = loadedBucket === bucket
  const hasLoadedCache = loadedBucket !== null
  const activeCache = useMemo(
    () => (cacheReady ? cache : new Map<string, BrowserCacheHeightRow>()),
    [cache, cacheReady]
  )

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      loadBrowserCacheRows(sessionId, bucket),
      loadBrowserCacheHtml(bucket),
    ]).then(([rows, html]) => {
      if (cancelled) return
      const valid = new Map<string, BrowserCacheHeightRow>()
      for (const message of messages) {
        const row = rows.get(message.id)
        if (row?.contentHash === hashContent(message.text)) {
          valid.set(message.id, row)
        }
      }
      setLocalCache(valid)
      setHtmlCache(html)
      setLoadedBucket(bucket)
    })
    return () => {
      cancelled = true
    }
  }, [bucket, messages, sessionId])

  useLayoutEffect(() => {
    if (loadedBucket === null) return
    setCache(cacheLabel(cache.size, messages.length))
  }, [cache, loadedBucket, messages.length, setCache])

  const persistSettled = useSettledMeasurement<PendingBrowserMeasurement>(
    async ({ bucket: measuredBucket, element, height, message }) => {
      if (!element.isConnected || streaming?.id === message.id) return
      const body = element.querySelector<HTMLElement>("[data-message-body]")
      if (!body || body.innerHTML.length === 0) return
      const contentHash = hashContent(message.text)
      const row: BrowserCacheHeightRow = {
        key: browserCacheKey({
          sessionId: message.sessionId,
          messageId: message.id,
          widthBucket: measuredBucket,
          contentHash,
        }),
        sessionId: message.sessionId,
        messageId: message.id,
        widthBucket: measuredBucket,
        contentHash,
        height,
        settledAt: Date.now(),
      }
      await putBrowserCacheRow(row, body.innerHTML)
      if (measuredBucket !== bucket) return
      setLocalCache((previous) => {
        const next = new Map(previous)
        next.set(message.id, row)
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

  return {
    bucket,
    cacheReady,
    hasLoadedCache,
    activeCache,
    htmlCache,
    persistSettled,
    streaming,
  }
}
