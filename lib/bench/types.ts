export type CacheLabel = "cold" | "partial" | "warm" | "n/a"

export type BenchCommands = {
  jump: (messageIndex: number) => Promise<void>
  streamLast: () => Promise<void>
  stopStream: () => void
  resetCache: () => Promise<void>
}

export type BenchRuntime = {
  version: 2
  snapshot: BenchSnapshot
  commands: BenchCommands
}

export type BenchSnapshot = {
  appId: string
  cache: CacheLabel
  messageCount: number
  fcpMs: number | null
  firstPaintMs: number | null
  jumpMs: number | null
  correctionCount: number
  correctedPx: number
  domNodes: number | null
  serverQueryMs: number | null
  htmlCacheHits: number | null
  htmlCacheMisses: number | null
}
