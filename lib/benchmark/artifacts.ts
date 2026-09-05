import { spawn } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import os from "node:os"

import type { Browser } from "puppeteer-core"
import {
  DATASET_VERSION,
  LAYOUT_VERSION,
  MESSAGE_COUNT,
  RENDERER_VERSION,
  generateMessages,
  hashContent,
} from "@/lib/seed"

import { RESULTS_DIR, REPO_ROOT, type BenchmarkOptions } from "./options.ts"
import { summarizeRuns, summaryMarkdown } from "./stats.ts"
import type { BenchmarkArtifact, BenchmarkMetadata } from "./types.ts"

async function gitText(args: string[]): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const child = spawn("git", args, { cwd: REPO_ROOT })
    let output = ""
    child.stdout.on("data", (chunk) => {
      output += String(chunk)
    })
    child.once("error", reject)
    child.once("exit", (code) => {
      if (code === 0) resolve(output.trim())
      else reject(new Error(`git ${args.join(" ")} exited ${code}`))
    })
  })
}

function corpusHash(): number {
  return hashContent(
    generateMessages()
      .map(
        (message) =>
          `${message.id}:${message.kind}:${message.text}:${message.heightClass}`
      )
      .join("|")
  )
}

export async function benchmarkMetadata(
  browser: Browser,
  options: BenchmarkOptions
): Promise<BenchmarkMetadata> {
  const commit = await gitText(["rev-parse", "HEAD"])
  const dirty = (await gitText(["status", "--porcelain"])).length > 0
  return {
    generatedAt: new Date().toISOString(),
    commit,
    dirty,
    browser: await browser.version(),
    os: `${os.type()} ${os.release()} ${os.arch()}`,
    corpusHash: corpusHash(),
    datasetVersion: DATASET_VERSION,
    rendererVersion: RENDERER_VERSION,
    layoutVersion: LAYOUT_VERSION,
    productionBuild: true,
    runsPerCell: options.runs,
    modes: options.modes,
    messageCount: MESSAGE_COUNT,
    widths: options.widths,
    height: options.height,
    dpr: options.dpr,
  }
}

export async function writeArtifacts(
  artifact: BenchmarkArtifact
): Promise<void> {
  const summary = summarizeRuns(artifact.results)
  await mkdir(RESULTS_DIR, { recursive: true })
  await Promise.all([
    writeFile(
      `${RESULTS_DIR}/raw.json`,
      `${JSON.stringify(artifact, null, 2)}\n`
    ),
    writeFile(
      `${RESULTS_DIR}/summary.json`,
      `${JSON.stringify(
        { metadata: artifact.metadata, status: artifact.status, summary },
        null,
        2
      )}\n`
    ),
    writeFile(
      `${RESULTS_DIR}/summary.md`,
      summaryMarkdown(summary, artifact.metadata.generatedAt, artifact.status)
    ),
  ])
}

export async function rewriteSummaryFromRaw(): Promise<void> {
  const raw = JSON.parse(
    await readFile(`${RESULTS_DIR}/raw.json`, "utf8")
  ) as BenchmarkArtifact
  await writeArtifacts(raw)
}
