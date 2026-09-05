import { readFile } from "node:fs/promises"
import path from "node:path"
import { workspaceRoot } from "@/lib/seed/browser-harness"
import type {
  BenchmarkArtifact,
  BenchmarkSummaryRow,
} from "@/lib/benchmark/types"

export async function readResults() {
  try {
    return JSON.parse(
      await readFile(
        path.join(workspaceRoot(), "benchmarks/results/summary.json"),
        "utf8"
      )
    ) as Pick<BenchmarkArtifact, "metadata" | "status"> & {
      summary: BenchmarkSummaryRow[]
    }
  } catch {
    return null
  }
}
