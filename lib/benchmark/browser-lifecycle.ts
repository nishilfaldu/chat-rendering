import { spawn, type ChildProcess } from "node:child_process"

import puppeteer, { type Browser } from "puppeteer-core"
import {
  chromeExecutable,
  ensureRailgunServer,
  stopRailgunServer,
} from "@/lib/seed/browser-harness"

import { REPO_ROOT, type BenchmarkOptions } from "./options.ts"

async function runCommand(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      env: process.env,
      stdio: "inherit",
    })
    child.once("error", reject)
    child.once("exit", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`))
    })
  })
}

export async function openBenchmarkBrowser(
  options: BenchmarkOptions
): Promise<{ browser: Browser; server: ChildProcess | null }> {
  if (options.build) await runCommand("pnpm", ["build"])
  const server = options.startServer
    ? await ensureRailgunServer({
        url: options.url,
        mode: "production",
        cwd: REPO_ROOT,
      })
    : null
  const browser = await puppeteer.launch({
    executablePath: chromeExecutable(),
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--enable-precise-memory-info",
    ],
  })
  return { browser, server }
}

export async function closeBenchmarkBrowser(
  browser: Browser,
  server: ChildProcess | null
): Promise<void> {
  await browser.close()
  stopRailgunServer(server)
}
