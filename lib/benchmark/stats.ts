import type {
  BenchmarkArtifact,
  BenchmarkRun,
  BenchmarkSummaryRow,
  NumericSummary,
} from "./types.ts"

function sortedFinite(values: Array<number | null>): number[] {
  return values
    .filter(
      (value): value is number => value !== null && Number.isFinite(value)
    )
    .sort((a, b) => a - b)
}

export function percentile(
  values: Array<number | null>,
  proportion: number
): number | null {
  const sorted = sortedFinite(values)
  if (sorted.length === 0) return null
  const rank = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(proportion * sorted.length) - 1)
  )
  return sorted[rank] ?? null
}

export function numericSummary(values: Array<number | null>): NumericSummary {
  return {
    median: percentile(values, 0.5),
    p95: percentile(values, 0.95),
  }
}

export function summarizeRuns(results: BenchmarkRun[]): BenchmarkSummaryRow[] {
  const groups = new Map<string, BenchmarkRun[]>()
  for (const result of results) {
    const key = `${result.mode}:${result.width}`
    const group = groups.get(key) ?? []
    group.push(result)
    groups.set(key, group)
  }

  return [...groups.values()]
    .map((runs): BenchmarkSummaryRow => {
      const first = runs[0]
      if (!first) throw new Error("benchmark summary received an empty group")
      return {
        mode: first.mode,
        width: first.width,
        runs: runs.length,
        cacheLabels: [...new Set(runs.map((run) => run.cache))].sort(),
        navigationVisibleMs: numericSummary(
          runs.map((run) => run.navigationVisibleMs)
        ),
        geometryStableMs: numericSummary(
          runs.map((run) => run.geometryStableMs)
        ),
        fcpMs: numericSummary(runs.map((run) => run.fcpMs)),
        lcpMs: numericSummary(runs.map((run) => run.lcpMs)),
        cls: numericSummary(runs.map((run) => run.cls)),
        correctionCount: numericSummary(runs.map((run) => run.correctionCount)),
        correctedPx: numericSummary(runs.map((run) => run.correctedPx)),
        jumpMs: numericSummary(runs.map((run) => run.jumpMs)),
        jumpTargetErrorPx: numericSummary(
          runs.map((run) => run.jumpTargetErrorPx)
        ),
        scrollAnchorDisplacementPx: numericSummary(
          runs.map((run) => run.scrollAnchorDisplacementPx)
        ),
        resizeAnchorDisplacementPx: numericSummary(
          runs.map((run) => run.resizeAnchorDisplacementPx)
        ),
        frameP50Ms: numericSummary(runs.map((run) => run.frameTimeMs.p50)),
        frameP95Ms: numericSummary(runs.map((run) => run.frameTimeMs.p95)),
        frameP99Ms: numericSummary(runs.map((run) => run.frameTimeMs.p99)),
        longTaskCount: numericSummary(runs.map((run) => run.longTaskCount)),
        mainThreadBlockingMs: numericSummary(
          runs.map((run) => run.mainThreadBlockingMs)
        ),
        pendingFrames: numericSummary(
          runs.map((run) => run.pendingFrames ?? null)
        ),
        blankFrames: numericSummary(runs.map((run) => run.blankFrames)),
        clippedFrames: numericSummary(runs.map((run) => run.clippedFrames)),
        domNodes: numericSummary(runs.map((run) => run.domNodes)),
        heapBeforeBytes: numericSummary(runs.map((run) => run.heapBeforeBytes)),
        heapAfterBytes: numericSummary(runs.map((run) => run.heapAfterBytes)),
        heapGrowthBytes: numericSummary(runs.map((run) => run.heapGrowthBytes)),
        initialPayloadBytes: numericSummary(
          runs.map((run) => run.initialPayloadBytes)
        ),
        serverQueryMs: numericSummary(runs.map((run) => run.serverQueryMs)),
        htmlCacheHits: numericSummary(runs.map((run) => run.htmlCacheHits)),
        htmlCacheMisses: numericSummary(runs.map((run) => run.htmlCacheMisses)),
        htmlCacheHitRate: numericSummary(
          runs.map((run) => run.htmlCacheHitRate)
        ),
        streamBottomErrorPx: numericSummary(
          runs.map((run) => run.streamBottomErrorPx)
        ),
      }
    })
    .sort((a, b) => a.width - b.width || a.mode.localeCompare(b.mode))
}

function fmt(value: number | null, digits = 1): string {
  return value === null ? "—" : value.toFixed(digits)
}

function kib(value: number | null): string {
  return value === null ? "—" : (value / 1024).toFixed(0)
}

function mib(value: number | null): string {
  return value === null ? "—" : (value / 1_048_576).toFixed(2)
}

function pair(
  summary: NumericSummary,
  format: (value: number | null) => string = (value) => fmt(value)
): string {
  return `${format(summary.median)} (${format(summary.p95)})`
}

export function summaryMarkdown(
  rows: BenchmarkSummaryRow[],
  generatedAt: string,
  status: BenchmarkArtifact["status"]
): string {
  const lines = [
    "# Chat rendering benchmark summary",
    "",
    `Generated ${generatedAt}. Values are medians; parenthesized values are p95.`,
    status.complete
      ? `Complete: ${status.completedRuns}/${status.expectedRuns} samples.`
      : `INCOMPLETE CHECKPOINT: ${status.completedRuns}/${status.expectedRuns} samples.`,
    "",
    "## Loading and geometry",
    "",
    "| mode | width | visible ms | stable ms | fcp ms | lcp ms | cls | corrections | corrected px | jump ms | jump error px | jump drift px | resize drift px | stream bottom px |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ]
  for (const row of rows) {
    lines.push(
      `| ${row.mode} | ${row.width} | ${pair(row.navigationVisibleMs)} | ${pair(row.geometryStableMs)} | ${pair(row.fcpMs)} | ${pair(row.lcpMs)} | ${pair(row.cls, (value) => fmt(value, 3))} | ${pair(row.correctionCount, (value) => fmt(value, 0))} | ${pair(row.correctedPx)} | ${pair(row.jumpMs)} | ${pair(row.jumpTargetErrorPx)} | ${pair(row.scrollAnchorDisplacementPx)} | ${pair(row.resizeAnchorDisplacementPx)} | ${pair(row.streamBottomErrorPx)} |`
    )
  }
  lines.push(
    "",
    "## Responsiveness and correctness",
    "",
    "| mode | width | frame p50 ms | frame p95 ms | frame p99 ms | long tasks | blocking ms | blank frames | clipped frames | content loading frames |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"
  )
  for (const row of rows) {
    lines.push(
      `| ${row.mode} | ${row.width} | ${pair(row.frameP50Ms)} | ${pair(row.frameP95Ms)} | ${pair(row.frameP99Ms)} | ${pair(row.longTaskCount, (value) => fmt(value, 0))} | ${pair(row.mainThreadBlockingMs)} | ${pair(row.blankFrames, (value) => fmt(value, 0))} | ${pair(row.clippedFrames, (value) => fmt(value, 0))} | ${pair(row.pendingFrames, (value) => fmt(value, 0))} |`
    )
  }
  lines.push(
    "",
    "## Resource and cache profile",
    "",
    "| mode | width | cache | DOM nodes | heap before MiB | heap after MiB | heap growth MiB | payload KiB | server query ms | HTML hits | HTML misses | HTML hit rate |",
    "| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"
  )
  for (const row of rows) {
    lines.push(
      `| ${row.mode} | ${row.width} | ${row.cacheLabels.join(", ")} | ${pair(row.domNodes, (value) => fmt(value, 0))} | ${pair(row.heapBeforeBytes, mib)} | ${pair(row.heapAfterBytes, mib)} | ${pair(row.heapGrowthBytes, mib)} | ${pair(row.initialPayloadBytes, kib)} | ${pair(row.serverQueryMs)} | ${pair(row.htmlCacheHits, (value) => fmt(value, 0))} | ${pair(row.htmlCacheMisses, (value) => fmt(value, 0))} | ${pair(row.htmlCacheHitRate, (value) => (value === null ? "—" : `${(value * 100).toFixed(1)}%`))} |`
    )
  }
  lines.push(
    "",
    "Every cell reports median with p95 in parentheses. The raw artifact retains every individual observation."
  )
  return `${lines.join("\n")}\n`
}
