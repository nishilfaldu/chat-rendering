import assert from "node:assert/strict"
import puppeteer from "puppeteer-core"
import { chromeExecutable } from "@/lib/seed/browser-harness"
const browser = await puppeteer.launch({
  executablePath: chromeExecutable(),
  headless: true,
})
try {
  const page = await browser.newPage()
  await page.evaluateOnNewDocument("globalThis.__name = t => t")
  const errors: string[] = []
  page.on("console", (m) => {
    if (m.type() === "error") {
      errors.push(m.text())
    }
  })
  page.on("pageerror", (e) => errors.push(String(e)))
  await page.goto(process.env.CHECK_URL ?? "http://localhost:3000")
  await page.waitForFunction(
    () => !document.querySelector<HTMLButtonElement>(".bench-run")?.disabled
  )
  await page.click(".bench-run")
  await page.waitForFunction(
    () => document.querySelector<HTMLButtonElement>(".bench-run")?.disabled
  )
  await page.waitForFunction(
    () =>
      Boolean(
        document.querySelector(
          ".bench-primary-reading, .bench-comparison-readings"
        )
      ) && !document.querySelector(".bench-measuring"),
    { timeout: 45_000 }
  )
  console.log(
    await page.evaluate(() => ({
      font: getComputedStyle(document.querySelector("h1")!).fontFamily,
      mono: getComputedStyle(
        document.querySelector(".bench-comparison-readings td, dd")!
      ).fontFamily,
    }))
  )
  assert.deepEqual(errors, [], "scrolling must not trigger lifecycle errors")
  console.log("Scroll lifecycle passed")
} finally {
  await browser.close()
}
