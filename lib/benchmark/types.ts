export const BENCHMARK_MODES = [
  "naive",
  "baseline",
  "height-class",
  "orbit",
  "server-heights",
  "server-index",
] as const

export type BenchmarkMode = (typeof BENCHMARK_MODES)[number]

export type NumericSummary = {
  median: number | null
  p95: number | null
}

export type FrameSummary = {
  p50: number | null
  p95: number | null
  p99: number | null
}

export type BenchmarkRun = {
  run: number
  mode: BenchmarkMode
  width: number
  height: number
  dpr: number
  cache: string
  navigationVisibleMs: number | null
  geometryStableMs: number | null
  fcpMs: number | null
  lcpMs: number | null
  cls: number
  correctionCount: number
  correctedPx: number
  scrollAnchorDisplacementPx: number | null
  resizeAnchorDisplacementPx: number | null
  jumpTargetErrorPx: number | null
  jumpMs: number | null
  frameTimeMs: FrameSummary
  longTaskCount: number
  mainThreadBlockingMs: number
  pendingFrames: number
  blankFrames: number
  clippedFrames: number
  domNodes: number | null
  heapBeforeBytes: number
  heapAfterBytes: number
  heapGrowthBytes: number
  initialPayloadBytes: number
  serverQueryMs: number | null
  htmlCacheHits: number | null
  htmlCacheMisses: number | null
  htmlCacheHitRate: number | null
  streamBottomErrorPx: number | null
}

export type BenchmarkMetadata = {
  generatedAt: string
  commit: string
  dirty: boolean
  browser: string
  os: string
  corpusHash: number
  datasetVersion: string
  rendererVersion: string
  layoutVersion: string
  productionBuild: true
  runsPerCell: number
  modes: BenchmarkMode[]
  messageCount: number
  widths: number[]
  height: number
  dpr: number
}

export type BenchmarkArtifact = {
  metadata: BenchmarkMetadata
  status: {
    complete: boolean
    completedRuns: number
    expectedRuns: number
  }
  results: BenchmarkRun[]
}

export type BenchmarkSummaryRow = {
  mode: BenchmarkMode
  width: number
  runs: number
  cacheLabels: string[]
  navigationVisibleMs: NumericSummary
  geometryStableMs: NumericSummary
  fcpMs: NumericSummary
  lcpMs: NumericSummary
  cls: NumericSummary
  correctionCount: NumericSummary
  correctedPx: NumericSummary
  jumpMs: NumericSummary
  jumpTargetErrorPx: NumericSummary
  scrollAnchorDisplacementPx: NumericSummary
  resizeAnchorDisplacementPx: NumericSummary
  frameP50Ms: NumericSummary
  frameP95Ms: NumericSummary
  frameP99Ms: NumericSummary
  longTaskCount: NumericSummary
  mainThreadBlockingMs: NumericSummary
  pendingFrames: NumericSummary
  blankFrames: NumericSummary
  clippedFrames: NumericSummary
  domNodes: NumericSummary
  heapBeforeBytes: NumericSummary
  heapAfterBytes: NumericSummary
  heapGrowthBytes: NumericSummary
  initialPayloadBytes: NumericSummary
  serverQueryMs: NumericSummary
  htmlCacheHits: NumericSummary
  htmlCacheMisses: NumericSummary
  htmlCacheHitRate: NumericSummary
  streamBottomErrorPx: NumericSummary
}
