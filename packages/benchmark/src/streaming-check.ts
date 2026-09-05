import assert from "node:assert/strict"
import puppeteer from "puppeteer-core"
import { chromeExecutable } from "@chat-surface-bench/seed/browser-harness"

const browser = await puppeteer.launch({
  executablePath: chromeExecutable(),
  headless: true,
})
try {
  const page = await browser.newPage()
  await page.evaluateOnNewDocument("globalThis.__name = (target) => target")
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(String(error)))
  await page.goto(
    `${process.env.CHECK_URL ?? "http://localhost:3000"}/embed/baseline`
  )
  await page.waitForFunction(
    () => window.__RAILGUN_BENCH__?.snapshot.messageCount
  )
  for (let run = 0; run < 2; run++) {
    await page.evaluate(() => {
      void window.__RAILGUN_BENCH__!.commands.streamLast()
    })
    await page.waitForSelector(".shiki-stream code span")
    assert.ok(
      await page.$eval(".shiki-stream code", (el) => el.textContent!.length > 0)
    )
    if (run === 0)
      await page.evaluate(() => window.__RAILGUN_BENCH__!.commands.stopStream())
    await page.waitForFunction(() => !document.querySelector(".shiki-stream"))
  }
  await page.evaluate(() => {
    void window.__RAILGUN_BENCH__!.commands.streamLast()
  })
  await page.waitForSelector(".shiki-stream code span")
  await page.evaluate(async () => {
    await window.__RAILGUN_BENCH__!.commands.jump(8000)
    await window.__RAILGUN_BENCH__!.commands.jump(9999)
  })
  await page.waitForFunction(() => !document.querySelector(".shiki-stream"))
  assert.deepEqual(
    errors,
    [],
    "streaming, stopping, and replaying must not throw"
  )
  console.log("Streaming lifecycle passed")
} finally {
  await browser.close()
}
