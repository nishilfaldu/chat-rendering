import path from "node:path"
import process from "node:process"

import { workspaceRoot } from "@/lib/seed/browser-harness"

import { BENCHMARK_MODES, type BenchmarkMode } from "./types.ts"

export const REPO_ROOT = workspaceRoot(import.meta.dirname)
export const RESULTS_DIR = path.join(REPO_ROOT, "benchmarks", "results")
const DEFAULT_URL = "http://127.0.0.1:3110"

export type BenchmarkOptions = {
  url: string
  runs: number
  widths: number[]
  modes: BenchmarkMode[]
  height: number
  dpr: number
  build: boolean
  startServer: boolean
  smoke: boolean
}

function valueAfter(prefix: string): string | undefined {
  const argument = process.argv.find((value) => value.startsWith(`${prefix}=`))
  return argument?.slice(prefix.length + 1)
}

function numberList(value: string | undefined, fallback: number[]): number[] {
  if (!value) return fallback
  const numbers = value
    .split(",")
    .map(Number)
    .filter((item) => Number.isFinite(item) && item > 0)
  return numbers.length > 0 ? numbers : fallback
}

export function parseOptions(): BenchmarkOptions {
  const smoke = process.argv.includes("--smoke")
  const requestedModes = (valueAfter("--modes")?.split(",") ?? []).filter(
    (mode): mode is BenchmarkMode =>
      (BENCHMARK_MODES as readonly string[]).includes(mode)
  )
  return {
    url: valueAfter("--url") ?? DEFAULT_URL,
    runs: Number(valueAfter("--runs")) || (smoke ? 1 : 20),
    widths: numberList(
      valueAfter("--widths"),
      smoke ? [768] : [480, 768, 1280]
    ),
    modes: requestedModes.length > 0 ? requestedModes : [...BENCHMARK_MODES],
    height: Number(valueAfter("--height")) || 900,
    dpr: Number(valueAfter("--dpr")) || 1,
    build: !process.argv.includes("--no-build"),
    startServer: !process.argv.includes("--no-server"),
    smoke,
  }
}
