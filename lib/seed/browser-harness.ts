import { spawn, type ChildProcess } from "node:child_process"
import { existsSync } from "node:fs"

import { workspaceRoot } from "./workspace.ts"

export { workspaceRoot } from "./workspace.ts"

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
] as const

export function chromeExecutable(): string {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const candidate = CHROME_CANDIDATES.find((item) => existsSync(item))
  if (candidate) return candidate
  throw new Error(
    "Chrome was not found; set CHROME_PATH to a Chromium executable"
  )
}

export async function railgunIsUp(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/api/health`)
    if (!response.ok) return false
    const body = (await response.json()) as { app?: string }
    return body.app === "railgun"
  } catch {
    return false
  }
}

async function waitForRailgun(url: string, timeoutMs: number): Promise<void> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (await railgunIsUp(url)) return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Railgun did not start at ${url}`)
}

export async function ensureRailgunServer({
  url,
  mode,
  cwd = workspaceRoot(),
}: {
  url: string
  mode: "development" | "production"
  cwd?: string
}): Promise<ChildProcess | null> {
  if (await railgunIsUp(url)) return null
  const port = new URL(url).port || "80"
  const child = spawn(
    "pnpm",
    ["exec", "next", mode === "development" ? "dev" : "start", "--port", port],
    { cwd, env: process.env, stdio: "inherit" }
  )
  await waitForRailgun(url, 60_000)
  return child
}

export function stopRailgunServer(child: ChildProcess | null): void {
  if (!child?.pid) return
  try {
    child.kill("SIGTERM")
  } catch {
    // The process already exited.
  }
}
