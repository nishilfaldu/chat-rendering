import assert from "node:assert/strict"
import puppeteer from "puppeteer-core"
import { chromeExecutable } from "@/lib/seed/browser-harness"

const browser = await puppeteer.launch({
  executablePath: chromeExecutable(),
  headless: true,
  args: ["--no-sandbox"],
})
try {
  for (const mode of process.env.CHECK_MODE
    ? [process.env.CHECK_MODE]
    : ["baseline", "orbit", "server-heights", "server-index"]) {
    const page = await browser.newPage()
    await page.evaluateOnNewDocument("globalThis.__name = (target) => target")
    await page.setViewport({ width: 768, height: 900 })
    await page.goto(
      `${process.env.CHECK_URL ?? "http://localhost:3000"}/embed/${mode}?bench=1&geometry=${process.env.CHECK_GEOMETRY ?? "saved"}`
    )
    await page.waitForFunction(
      () => window.__RAILGUN_BENCH__?.snapshot.messageCount === 10_000
    )
    await new Promise((resolve) => setTimeout(resolve, 800))
    const result = await page.evaluate(async () => {
      const scroll = document.querySelector<HTMLElement>("[data-chat-scroll]")!
      let blank = 0
      let samples = 0
      const start = performance.now()
      await new Promise<void>((resolve) => {
        const tick = (now: number) => {
          const r = scroll.getBoundingClientRect()
          const visible = [
            ...scroll.querySelectorAll<HTMLElement>("[data-message-id]"),
          ].some((el) => {
            const b = el.getBoundingClientRect()
            return b.bottom > r.top && b.top < r.bottom
          })
          if (!visible) blank++
          samples++
          const progress = Math.min(1, (now - start) / 1200)
          scroll.scrollTop =
            (1 - progress * 0.85) * (scroll.scrollHeight - scroll.clientHeight)
          if (progress < 1) requestAnimationFrame(tick)
          else resolve()
        }
        requestAnimationFrame(tick)
      })
      const stream = window.__RAILGUN_BENCH__!.commands.streamLast()
      await new Promise((resolve) => setTimeout(resolve, 250))
      await window.__RAILGUN_BENCH__!.commands.jump(8000)
      const away = scroll.scrollTop
      await new Promise((resolve) => setTimeout(resolve, 250))
      const displacement = Math.abs(scroll.scrollTop - away)
      window.__RAILGUN_BENCH__!.commands.stopStream()
      void stream
      return { blank, samples, displacement }
    })
    console.log(mode, result)
    assert.equal(
      result.blank,
      0,
      "scrolling should keep a mounted message in the viewport"
    )
    assert.ok(
      result.displacement < 2,
      "streaming must not pull a reader back to the bottom"
    )
    await page.close()
  }
} finally {
  await browser.close()
}
