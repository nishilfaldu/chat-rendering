"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { ChatAppId } from "@/lib/chat-implementations"

import type {
  BenchCommands,
  BenchRuntime,
  BenchSnapshot,
  CacheLabel,
} from "./types.ts"

type BenchApi = {
  snapshot: BenchSnapshot
  setCache: (cache: CacheLabel) => void
  setMessageCount: (count: number) => void
  markFirstPaint: () => void
  recordJump: (ms: number) => void
  recordCorrection: (delta: number) => void
  setDomNodes: (count: number | null) => void
  setHtmlCacheStats: (hits: number, misses: number) => void
  registerCommands: (commands: BenchCommands | null) => void
}

const BenchContext = createContext<BenchApi | null>(null)

export function BenchProvider({
  appId,
  cache,
  serverQueryMs = null,
  children,
}: {
  appId: ChatAppId
  cache: CacheLabel
  serverQueryMs?: number | null
  children: ReactNode
}) {
  // eslint-disable-next-line react-hooks/purity -- capture session start at first render
  const start = useRef(performance.now())
  const painted = useRef(false)
  const correctionFrame = useRef<number | null>(null)
  const pendingCorrection = useRef({ count: 0, px: 0 })
  const commandsRef = useRef<BenchCommands | null>(null)
  const [snapshot, setSnapshot] = useState<BenchSnapshot>({
    appId,
    cache,
    messageCount: 0,
    fcpMs: null,
    firstPaintMs: null,
    jumpMs: null,
    correctionCount: 0,
    correctedPx: 0,
    domNodes: null,
    serverQueryMs,
    htmlCacheHits: null,
    htmlCacheMisses: null,
  })

  useEffect(() => {
    const recordFcp = (entries: PerformanceEntry[]) => {
      const fcp = entries.find(
        (entry) => entry.name === "first-contentful-paint"
      )
      if (!fcp) return false
      setSnapshot((prev) =>
        prev.fcpMs === fcp.startTime ? prev : { ...prev, fcpMs: fcp.startTime }
      )
      return true
    }

    if (recordFcp(performance.getEntriesByType("paint"))) return

    const observer = new PerformanceObserver((list) => {
      if (recordFcp(list.getEntries())) observer.disconnect()
    })
    observer.observe({ type: "paint", buffered: true })
    return () => observer.disconnect()
  }, [])

  const commands = useMemo<BenchCommands>(
    () => ({
      jump: async (messageIndex) => {
        await commandsRef.current?.jump(messageIndex)
      },
      streamLast: async () => {
        await commandsRef.current?.streamLast()
      },
      stopStream: () => commandsRef.current?.stopStream(),
      resetCache: async () => {
        await commandsRef.current?.resetCache()
      },
    }),
    []
  )

  useEffect(() => {
    const runtime: BenchRuntime = { version: 2, snapshot, commands }
    window.__RAILGUN_BENCH__ = runtime
    window.dispatchEvent(
      new CustomEvent("railgun:bench-snapshot", { detail: snapshot })
    )
    if (window.parent !== window) {
      window.parent.postMessage(
        { type: "railgun:bench-snapshot", snapshot },
        window.location.origin
      )
    }
    return () => {
      if (window.__RAILGUN_BENCH__ === runtime) {
        delete window.__RAILGUN_BENCH__
      }
    }
  }, [commands, snapshot])

  useEffect(
    () => () => {
      if (correctionFrame.current !== null) {
        cancelAnimationFrame(correctionFrame.current)
      }
    },
    []
  )

  const setCache = useCallback((next: CacheLabel) => {
    setSnapshot((prev) => ({ ...prev, cache: next }))
  }, [])

  const setMessageCount = useCallback((count: number) => {
    setSnapshot((prev) => ({
      ...prev,
      messageCount: count,
    }))
  }, [])

  const markFirstPaint = useCallback(() => {
    if (painted.current) return
    painted.current = true
    const ms = performance.now() - start.current
    setSnapshot((prev) => ({ ...prev, firstPaintMs: ms }))
  }, [])

  const recordJump = useCallback((ms: number) => {
    setSnapshot((prev) => ({
      ...prev,
      jumpMs: ms,
    }))
  }, [])

  const recordCorrection = useCallback((delta: number) => {
    pendingCorrection.current.count += 1
    pendingCorrection.current.px += Math.abs(delta)
    if (correctionFrame.current !== null) return
    correctionFrame.current = requestAnimationFrame(() => {
      correctionFrame.current = null
      const pending = pendingCorrection.current
      pendingCorrection.current = { count: 0, px: 0 }
      setSnapshot((prev) => ({
        ...prev,
        correctionCount: prev.correctionCount + pending.count,
        correctedPx: prev.correctedPx + pending.px,
      }))
    })
  }, [])

  const setDomNodes = useCallback((count: number | null) => {
    setSnapshot((prev) => ({ ...prev, domNodes: count }))
  }, [])

  const setHtmlCacheStats = useCallback((hits: number, misses: number) => {
    setSnapshot((prev) => ({
      ...prev,
      htmlCacheHits: hits,
      htmlCacheMisses: misses,
    }))
  }, [])

  const registerCommands = useCallback((next: BenchCommands | null) => {
    commandsRef.current = next
  }, [])

  const value = useMemo(
    () => ({
      snapshot,
      setCache,
      setMessageCount,
      markFirstPaint,
      recordJump,
      recordCorrection,
      setDomNodes,
      setHtmlCacheStats,
      registerCommands,
    }),
    [
      markFirstPaint,
      recordCorrection,
      recordJump,
      registerCommands,
      setCache,
      setDomNodes,
      setHtmlCacheStats,
      setMessageCount,
      snapshot,
    ]
  )

  return <BenchContext.Provider value={value}>{children}</BenchContext.Provider>
}

declare global {
  interface Window {
    __RAILGUN_BENCH__?: BenchRuntime
  }
}

export function useBench(): BenchApi {
  const ctx = useContext(BenchContext)
  if (!ctx) {
    throw new Error("useBench must be used under BenchProvider")
  }
  return ctx
}
