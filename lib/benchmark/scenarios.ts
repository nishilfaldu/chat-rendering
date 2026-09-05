import type { Browser, Page } from "puppeteer-core"
import type {
  BenchRuntime,
  BenchSnapshot,
} from "@/lib/bench/types"
import type { ChatAppId } from "@/lib/chat-implementations"
import { MESSAGE_COUNT } from "@/lib/seed"

import { percentile } from "./stats.ts"
import type { BenchmarkOptions } from "./options.ts"
import type { BenchmarkRun, FrameSummary } from "./types.ts"

type PageTrace = {
  visibleAt: number | null
  lcp: number | null
  cls: number
  longTasks: number[]
}

declare global {
  interface Window {
    __RAILGUN_BENCH__?: BenchRuntime
  }
}

async function installTrace(page: Page): Promise<void> {
  await page.evaluateOnNewDocument("globalThis.__name = (target) => target")
  await page.evaluateOnNewDocument(() => {
    const trace: PageTrace = {
      visibleAt: null,
      lcp: null,
      cls: 0,
      longTasks: [],
    }
    ;(window as unknown as { __RAILGUN_TRACE__: PageTrace }).__RAILGUN_TRACE__ =
      trace

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          trace.longTasks.push(entry.duration)
      }).observe({ type: "longtask", buffered: true })
    } catch {
      // Unsupported in some Chromium builds.
    }
    try {
      new PerformanceObserver((list) => {
        const last = list.getEntries().at(-1)
        if (last) trace.lcp = last.startTime
      }).observe({ type: "largest-contentful-paint", buffered: true })
    } catch {
      // Unsupported in some Chromium builds.
    }
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            hadRecentInput?: boolean
            value?: number
          }
          if (!shift.hadRecentInput) trace.cls += shift.value ?? 0
        }
      }).observe({ type: "layout-shift", buffered: true })
    } catch {
      // Unsupported in some Chromium builds.
    }

    const findVisibleMessage = () => {
      if (trace.visibleAt !== null) return
      const scroll = document.querySelector<HTMLElement>("[data-chat-scroll]")
      if (scroll) {
        const viewport = scroll.getBoundingClientRect()
        const message = document
          .elementsFromPoint(
            viewport.left + viewport.width / 2,
            viewport.top + viewport.height / 2
          )
          .some((element) => element.closest("[data-message-id]"))
        if (message) {
          trace.visibleAt = performance.now()
          return
        }
      }
      requestAnimationFrame(findVisibleMessage)
    }
    requestAnimationFrame(findVisibleMessage)
  })
}

async function waitForGeometryStable(
  page: Page,
  quietMs = 500,
  timeoutMs = 12_000
): Promise<number | null> {
  return await page.evaluate(
    async ({ quietMs, timeoutMs }) => {
      const started = performance.now()
      let lastChange = started
      let signature = ""
      while (performance.now() - started < timeoutMs) {
        const scroll = document.querySelector<HTMLElement>("[data-chat-scroll]")
        const runtime = window.__RAILGUN_BENCH__
        const next = scroll
          ? [
              scroll.scrollHeight.toFixed(2),
              scroll.scrollTop.toFixed(2),
              runtime?.snapshot.correctionCount ?? 0,
              ...[
                ...document.querySelectorAll<HTMLElement>("[data-message-id]"),
              ]
                .slice(0, 40)
                .map((element) => {
                  const rect = element.getBoundingClientRect()
                  return `${element.dataset.messageId}:${rect.top.toFixed(1)}:${rect.height.toFixed(1)}`
                }),
            ].join("|")
          : ""
        if (next !== signature) {
          signature = next
          lastChange = performance.now()
        }
        if (
          scroll &&
          document.querySelector("[data-message-id]") &&
          performance.now() - lastChange >= quietMs
        ) {
          return performance.now()
        }
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      return null
    },
    { quietMs, timeoutMs }
  )
}

async function pageSnapshot(page: Page): Promise<BenchSnapshot> {
  return await page.evaluate(() => {
    const snapshot = window.__RAILGUN_BENCH__?.snapshot
    if (!snapshot) throw new Error("benchmark runtime is not ready")
    return snapshot
  })
}

function frameSummary(frameTimes: number[]): FrameSummary {
  return {
    p50: percentile(frameTimes, 0.5),
    p95: percentile(frameTimes, 0.95),
    p99: percentile(frameTimes, 0.99),
  }
}

export async function runFastScroll(page: Page): Promise<{
  frameTimes: number[]
  blankFrames: number
  clippedFrames: number
  pendingFrames: number
}> {
  return await page.evaluate(async () => {
    const scroll = document.querySelector<HTMLElement>("[data-chat-scroll]")
    if (!scroll) throw new Error("chat scroll element is missing")
    const frameTimes: number[] = []
    let blankFrames = 0
    let clippedFrames = 0
    let pendingFrames = 0
    let lastFrame = performance.now()
    const started = lastFrame
    const duration = 1_200

    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        frameTimes.push(now - lastFrame)
        lastFrame = now
        const progress = Math.min(1, (now - started) / duration)
        const triangle =
          progress < 0.55 ? progress / 0.55 : (1 - progress) / 0.45
        const ratio = 1 - Math.max(0, triangle) * 0.85

        const rect = scroll.getBoundingClientRect()
        const visibleMessages = [
          ...scroll.querySelectorAll<HTMLElement>("[data-message-id]"),
        ].filter((element) => {
          const bounds = element.getBoundingClientRect()
          return bounds.bottom > rect.top && bounds.top < rect.bottom
        })
        if (visibleMessages.length === 0) blankFrames += 1
        if (
          visibleMessages.some((element) =>
            element.querySelector("[data-content-pending]")
          )
        )
          pendingFrames += 1

        const wrappers = [
          ...scroll.querySelectorAll<HTMLElement>("[data-index]"),
        ]
        const clipped = wrappers.some((wrapper) => {
          const message =
            wrapper.querySelector<HTMLElement>("[data-message-id]")
          return !!message && message.scrollHeight > wrapper.clientHeight + 1
        })
        const visibleRects = wrappers
          .map((wrapper) => wrapper.getBoundingClientRect())
          .filter((item) => item.bottom > rect.top && item.top < rect.bottom)
          .sort((a, b) => a.top - b.top)
        const overlapping = visibleRects.some(
          (item, index) =>
            index > 0 && item.top < (visibleRects[index - 1]?.bottom ?? 0) - 1
        )
        if (clipped || overlapping) clippedFrames += 1

        scroll.scrollTop =
          ratio * Math.max(0, scroll.scrollHeight - scroll.clientHeight)
        if (progress < 1) requestAnimationFrame(tick)
        else resolve()
      }
      requestAnimationFrame(tick)
    })
    return {
      frameTimes: frameTimes.slice(1),
      blankFrames,
      clippedFrames,
      pendingFrames,
    }
  })
}

async function submitJump(page: Page, target: number): Promise<void> {
  await page.evaluate(async (messageIndex) => {
    const runtime = window.__RAILGUN_BENCH__
    if (!runtime) throw new Error("benchmark runtime is missing")
    await runtime.commands.jump(messageIndex)
  }, target)
}

async function targetTop(page: Page, id: string): Promise<number | null> {
  return await page.evaluate((messageId) => {
    const scroll = document.querySelector<HTMLElement>("[data-chat-scroll]")
    const target = document.querySelector<HTMLElement>(
      `[data-message-id="${CSS.escape(messageId)}"]`
    )
    if (!scroll || !target) return null
    return (
      target.getBoundingClientRect().top - scroll.getBoundingClientRect().top
    )
  }, id)
}

async function streamBottomError(page: Page): Promise<number | null> {
  return await page.evaluate(async () => {
    const scroll = document.querySelector<HTMLElement>("[data-chat-scroll]")
    if (!scroll) return null
    scroll.scrollTop = scroll.scrollHeight
    const runtime = window.__RAILGUN_BENCH__
    if (!runtime) return null
    void runtime.commands.streamLast()
    let maximum = 0
    const started = performance.now()
    while (performance.now() - started < 1_000) {
      maximum = Math.max(
        maximum,
        Math.abs(scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight)
      )
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
    return maximum
  })
}

export async function runOne(input: {
  browser: Browser
  options: BenchmarkOptions
  mode: ChatAppId
  width: number
  run: number
}): Promise<BenchmarkRun> {
  const { browser, options, mode, width, run } = input
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({
    width,
    height: options.height,
    deviceScaleFactor: options.dpr,
  })
  await page.setCacheEnabled(false)
  await installTrace(page)

  const cdp = await page.createCDPSession()
  await cdp.send("Network.enable")
  let networkBytes = 0
  cdp.on("Network.loadingFinished", (event) => {
    networkBytes += event.encodedDataLength
  })

  const url = `${options.url}/embed/${mode}?bench=1`
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180_000 })
  await page.waitForFunction(
    (expected) =>
      window.__RAILGUN_BENCH__?.snapshot.messageCount === expected &&
      document.querySelector("[data-message-id]") !== null,
    { timeout: 180_000 },
    MESSAGE_COUNT
  )
  const geometryStableMs = await waitForGeometryStable(page)
  const initialPayloadBytes = networkBytes
  await cdp.send("HeapProfiler.collectGarbage")
  const heapBeforeBytes = (await page.metrics()).JSHeapUsedSize ?? 0

  const initialTrace = await page.evaluate(
    () =>
      (window as unknown as { __RAILGUN_TRACE__: PageTrace }).__RAILGUN_TRACE__
  )
  const fcpMs = await page.evaluate(
    () =>
      performance.getEntriesByName("first-contentful-paint")[0]?.startTime ??
      null
  )

  const scrollResult = await runFastScroll(page)
  const targetIndex = 8_000
  const targetId = `msg_${String(targetIndex).padStart(5, "0")}`
  await submitJump(page, targetIndex)
  await page.waitForSelector(`[data-message-id="${targetId}"]`, {
    timeout: 30_000,
  })
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  )
  const firstTargetTop = await targetTop(page, targetId)
  await waitForGeometryStable(page, 400, 8_000)
  const finalTargetTop = await targetTop(page, targetId)
  const scrollAnchorDisplacementPx =
    firstTargetTop === null || finalTargetTop === null
      ? null
      : Math.abs(finalTargetTop - firstTargetTop)
  const jumpTargetErrorPx =
    finalTargetTop === null ? null : Math.abs(finalTargetTop)

  const resizeStartTop = finalTargetTop
  await page.setViewport({
    width: Math.max(360, width - 64),
    height: options.height,
    deviceScaleFactor: options.dpr,
  })
  await waitForGeometryStable(page, 400, 8_000)
  await page.setViewport({
    width,
    height: options.height,
    deviceScaleFactor: options.dpr,
  })
  await waitForGeometryStable(page, 400, 8_000)
  const resizeEndTop = await targetTop(page, targetId)
  const resizeAnchorDisplacementPx =
    resizeStartTop === null || resizeEndTop === null
      ? null
      : Math.abs(resizeEndTop - resizeStartTop)

  const streamBottomErrorPx = await streamBottomError(page)
  const snapshot = await pageSnapshot(page)
  const trace = await page.evaluate(
    () =>
      (window as unknown as { __RAILGUN_TRACE__: PageTrace }).__RAILGUN_TRACE__
  )
  await cdp.send("HeapProfiler.collectGarbage")
  const heapAfterBytes = (await page.metrics()).JSHeapUsedSize ?? 0
  const htmlLookups =
    snapshot.htmlCacheHits !== null && snapshot.htmlCacheMisses !== null
      ? snapshot.htmlCacheHits + snapshot.htmlCacheMisses
      : 0

  await context.close()

  return {
    run,
    mode,
    width,
    height: options.height,
    dpr: options.dpr,
    cache: snapshot.cache,
    navigationVisibleMs: initialTrace.visibleAt,
    geometryStableMs,
    fcpMs,
    lcpMs: trace.lcp,
    cls: trace.cls,
    correctionCount: snapshot.correctionCount,
    correctedPx: snapshot.correctedPx,
    scrollAnchorDisplacementPx,
    resizeAnchorDisplacementPx,
    jumpTargetErrorPx,
    jumpMs: snapshot.jumpMs,
    frameTimeMs: frameSummary(scrollResult.frameTimes),
    longTaskCount: trace.longTasks.length,
    mainThreadBlockingMs: trace.longTasks.reduce(
      (total, duration) => total + Math.max(0, duration - 50),
      0
    ),
    blankFrames: scrollResult.blankFrames,
    clippedFrames: scrollResult.clippedFrames,
    pendingFrames: scrollResult.pendingFrames,
    domNodes: snapshot.domNodes,
    heapBeforeBytes,
    heapAfterBytes,
    heapGrowthBytes: heapAfterBytes - heapBeforeBytes,
    initialPayloadBytes,
    serverQueryMs: snapshot.serverQueryMs,
    htmlCacheHits: snapshot.htmlCacheHits,
    htmlCacheMisses: snapshot.htmlCacheMisses,
    htmlCacheHitRate:
      htmlLookups > 0 && snapshot.htmlCacheHits !== null
        ? snapshot.htmlCacheHits / htmlLookups
        : null,
    streamBottomErrorPx,
  }
}
