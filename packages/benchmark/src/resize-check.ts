import assert from "node:assert/strict"
import { runFastScroll } from "./scenarios.ts"
import puppeteer from "puppeteer-core"
import { chromeExecutable } from "@chat-surface-bench/seed/browser-harness"
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
    await page.setViewport({ width: 480, height: 900 })
    await page.goto(
      `${process.env.CHECK_URL ?? "http://localhost:3000"}/embed/${mode}?bench=1`
    )
    await page.waitForFunction(
      () => window.__RAILGUN_BENCH__?.snapshot.messageCount === 10000
    )
    await runFastScroll(page)
    await page.evaluate(async () =>
      window.__RAILGUN_BENCH__!.commands.jump(8000)
    )
    await new Promise((r) => setTimeout(r, 600))
    const top = () =>
      page.evaluate(() => {
        const scroll = document.querySelector("[data-chat-scroll]")!
        const row = document.querySelector('[data-message-id="msg_08000"]')
        return row
          ? row.getBoundingClientRect().top - scroll.getBoundingClientRect().top
          : null
      })
    const before = await top()
    await page.setViewport({ width: 416, height: 900 })
    await new Promise((r) => setTimeout(r, 600))
    const narrow = await top()
    await page.setViewport({ width: 480, height: 900 })
    await new Promise((r) => setTimeout(r, 600))
    const after = await top()
    console.log(mode, { before, narrow, after })
    assert.ok(
      before !== null &&
        narrow !== null &&
        after !== null &&
        Math.abs(before - narrow) < 2 &&
        Math.abs(before - after) < 2,
      "resize should preserve the same message offset"
    )
    await page.close()
  }
} finally {
  await browser.close()
}
