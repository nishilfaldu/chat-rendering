import {
  benchmarkMetadata,
  rewriteSummaryFromRaw,
  writeArtifacts,
} from "./artifacts.ts"
import {
  closeBenchmarkBrowser,
  openBenchmarkBrowser,
} from "./browser-lifecycle.ts"
import { parseOptions, RESULTS_DIR } from "./options.ts"
import { runOne } from "./scenarios.ts"
import type { BenchmarkArtifact, BenchmarkRun } from "./types.ts"

async function main(): Promise<void> {
  if (process.argv.includes("--summarize")) {
    await rewriteSummaryFromRaw()
    console.log(`rewrote benchmark summaries in ${RESULTS_DIR}`)
    return
  }

  const options = parseOptions()
  const { browser, server } = await openBenchmarkBrowser(options)
  try {
    const metadata = await benchmarkMetadata(browser, options)
    const results: BenchmarkRun[] = []
    const expectedRuns =
      options.runs * options.widths.length * options.modes.length
    let completedRuns = 0

    await writeArtifacts({
      metadata,
      status: { complete: false, completedRuns, expectedRuns },
      results,
    })

    for (const width of options.widths) {
      for (let run = 1; run <= options.runs; run += 1) {
        for (const mode of options.modes) {
          const result = await runOne({
            browser,
            options,
            mode,
            width,
            run,
          })
          results.push(result)
          completedRuns += 1
          console.log(
            `[${completedRuns}/${expectedRuns}] ${mode} width=${width} visible=${result.navigationVisibleMs?.toFixed(1) ?? "—"}ms corrected=${result.correctedPx.toFixed(1)}px`
          )
          if (completedRuns % options.modes.length === 0) {
            await writeArtifacts({
              metadata,
              status: { complete: false, completedRuns, expectedRuns },
              results,
            })
          }
        }
      }
    }

    const artifact: BenchmarkArtifact = {
      metadata,
      status: { complete: true, completedRuns, expectedRuns },
      results,
    }
    await writeArtifacts(artifact)
    console.log(`wrote benchmark artifacts to ${RESULTS_DIR}`)
  } finally {
    await closeBenchmarkBrowser(browser, server)
  }
}

await main()
