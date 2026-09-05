import Link from "next/link"
import { LAYOUT_VERSION } from "@chat-surface-bench/seed"
import { APP_LINKS } from "@workspace/ui/lib/chat-implementations"
import { readResults } from "@/lib/benchmark-results"

export const dynamic = "force-dynamic"
export const metadata = { title: "Measurements · Chat rendering" }
const format = (value: number | null) =>
  value === null
    ? "—"
    : value.toLocaleString(undefined, { maximumFractionDigits: 1 })

export default async function ResultsPage() {
  const artifact = await readResults()
  return (
    <main className="bench-page">
      <article className="bench-document">
        <Link href="/">Back to the experiment</Link>
        <h1>Measurements</h1>
        <p>
          Different implementations trade initial work, rendering cost, memory,
          and content availability. These measurements describe one machine and
          one seeded workload.
        </p>
        {artifact ? (
          <>
            <h2>
              {artifact.metadata.runsPerCell < 20
                ? "Exploratory results"
                : "Production benchmark results"}
            </h2>
            <p>
              {artifact.status.complete ? "Completed" : "Incomplete"}:{" "}
              {artifact.status.completedRuns} of {artifact.status.expectedRuns}{" "}
              samples. {artifact.metadata.runsPerCell} runs per implementation
              and width. Recorded {artifact.metadata.generatedAt.slice(0, 10)}.
            </p>
            {artifact.metadata.layoutVersion !== LAYOUT_VERSION && (
              <p>
                These recorded results use the previous conversation layout. The
                live experiment measures the current layout.
              </p>
            )}
            {artifact.metadata.runsPerCell < 20 && (
              <p>
                This is a limited validation run, not the full 20-run protocol.
                Small samples do not support reliable tail-latency claims.
              </p>
            )}
            <p>
              {artifact.metadata.browser}. {artifact.metadata.os}. Production
              build, {artifact.metadata.messageCount.toLocaleString()} messages,
              viewport height {artifact.metadata.height}px, DPR{" "}
              {artifact.metadata.dpr}.
            </p>
            <p>
              Commit <code>{artifact.metadata.commit.slice(0, 12)}</code>
              {artifact.metadata.dirty
                ? "; the working tree had uncommitted changes."
                : "."}
            </p>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Implementation</th>
                    <th>Width</th>
                    <th>Visible (ms)</th>
                    <th>Jump (ms)</th>
                    <th>Empty samples</th>
                    <th>Clipped samples</th>
                  </tr>
                </thead>
                <tbody>
                  {artifact.summary.map((row) => (
                    <tr key={`${row.mode}-${row.width}`}>
                      <td>
                        {APP_LINKS.find((item) => item.id === row.mode)?.label}
                      </td>
                      <td>{row.width}</td>
                      <td>{format(row.navigationVisibleMs.median)}</td>
                      <td>{format(row.jumpMs.median)}</td>
                      <td>{format(row.blankFrames.median)}</td>
                      <td>{format(row.clippedFrames.median)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Table values are medians across runs. Empty and clipped values are
              sampled observations during scripted scrolling, not percentages.
              Download all measurements for frame intervals, memory,
              corrections, and cache conditions.
            </p>
            <a href="/api/results" download="chat-rendering-results.json">
              Download raw results
            </a>
          </>
        ) : (
          <p>
            No benchmark artifact is available yet. Run the command below to
            generate one.
          </p>
        )}
        <h2>Measurement boundary</h2>
        <p>
          Navigation timings include database queries, transfer, parsing,
          hydration, and rendering. Geometry stability includes a 500ms quiet
          period. Jump timing includes target content fetching where necessary
          and two animation frames after alignment.
        </p>
        <p>
          The benchmark runs implementations separately, round-robin, in fresh
          browser contexts. Browser caches begin empty; server measurements are
          whatever valid measurements exist in the seeded database. These are
          different cache conditions and are recorded in the artifact.
        </p>
        <h2>Run the full protocol</h2>
        <pre>pnpm bench</pre>
        <p>
          This seeds the corpus, builds for production, and runs all six
          implementations 20 times at 480, 768, and 1280 pixels. Raw
          observations and summaries are written to benchmarks/results.
        </p>
        <h2>Useful limits</h2>
        <p>
          The workload is synthetic. Images are placeholders, and text is
          replayed locally. Real model latency, image decoding, browser
          extensions, device load, and different message mixes can change the
          results. The estimated-height control intentionally demonstrates the
          correctness cost of never measuring content.
        </p>
      </article>
    </main>
  )
}
