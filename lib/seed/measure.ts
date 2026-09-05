import puppeteer from "puppeteer-core"
import {
  DATASET_VERSION,
  LAYOUT_VERSION,
  RENDERER_VERSION,
  WIDTH_BUCKETS,
  type HeightMeasurement,
} from "./types.ts"
import {
  chromeExecutable,
  ensureRailgunServer,
  railgunIsUp,
  stopRailgunServer,
} from "./browser-harness.ts"
import {
  expectedHeightCount,
  heightMeasurementCount,
  measurementsAreWarm,
  replaceHeights,
} from "./db.ts"

export async function measureHeights(options?: {
  force?: boolean
}): Promise<{ count: number }> {
  if (!options?.force && measurementsAreWarm()) {
    return { count: heightMeasurementCount() }
  }

  const CHAT_URL =
    process.env.CHAT_URL ??
    ((await railgunIsUp("http://localhost:3000"))
      ? "http://localhost:3000"
      : "http://localhost:3100")

  const child = (await railgunIsUp(CHAT_URL))
    ? null
    : await ensureRailgunServer({ url: CHAT_URL, mode: "development" })

  const browser = await puppeteer.launch({
    executablePath: chromeExecutable(),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  })

  try {
    const rows: HeightMeasurement[] = []
    for (const bucket of WIDTH_BUCKETS) {
      const page = await browser.newPage()
      page.setDefaultTimeout(180_000)
      await page.setViewport({ width: Math.max(bucket + 80, 500), height: 900 })
      await page.goto(`${CHAT_URL}/internal/measure?w=${bucket}`, {
        waitUntil: "domcontentloaded",
        timeout: 180_000,
      })
      await page.waitForFunction(
        () => document.querySelectorAll("[data-message-id]").length >= 10000,
        { timeout: 180_000 }
      )
      await page.evaluate(async () => {
        await document.fonts.ready
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })
      })
      const measured = await page.evaluate(() => {
        return [...document.querySelectorAll("[data-message-id]")].map(
          (node) => ({
            messageId: node.getAttribute("data-message-id") ?? "",
            contentHash: Number(node.getAttribute("data-content-hash") ?? "0"),
            px: (node as HTMLElement).offsetHeight,
          })
        )
      })
      rows.push(
        ...measured
          .filter((row) => row.messageId.length > 0 && row.px > 0)
          .map((row) => ({
            messageId: row.messageId,
            widthBucket: bucket,
            contentHash: row.contentHash,
            datasetVersion: DATASET_VERSION,
            rendererVersion: RENDERER_VERSION,
            layoutVersion: LAYOUT_VERSION,
            px: row.px,
            measuredAt: Date.now(),
            source: "headless" as const,
            settled: true,
          }))
      )
      console.log(`measured bucket ${bucket}: ${measured.length} rows`)
      await page.close()
    }
    replaceHeights(rows)
  } finally {
    await browser.close()
    stopRailgunServer(child)
  }

  const count = heightMeasurementCount()
  if (count < expectedHeightCount()) {
    throw new Error(
      `expected ${expectedHeightCount()} height rows, got ${count}`
    )
  }
  return { count }
}
