import assert from "node:assert/strict"
import puppeteer from "puppeteer-core"
import { chromeExecutable } from "@/lib/seed/browser-harness"
import { mkdir } from "node:fs/promises"
const browser = await puppeteer.launch({
  executablePath: chromeExecutable(),
  headless: true,
  args: ["--no-sandbox"],
})
const base = process.env.CHECK_URL ?? "http://localhost:3000"
try {
  const page = await browser.newPage()
  await page.evaluateOnNewDocument("globalThis.__name = (target) => target")
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(String(e)))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  await page.setViewport({ width: 1440, height: 1050 })
  await page.goto(base)
  await page.waitForFunction(
    () => !document.querySelector<HTMLButtonElement>(".bench-run")?.disabled
  )
  assert.deepEqual(
    await page.$$eval(".bench-page a", (links) =>
      links.map((link) => link.getAttribute("href"))
    ),
    ["/results"]
  )
  assert.equal(
    await page.$$eval(
      ".bench-inspector button, .bench-inspector select",
      (controls) => controls.length
    ),
    0
  )
  await page.click(".bench-run")
  await page.waitForFunction(() =>
    document
      .querySelector('[role="status"]')
      ?.textContent?.startsWith("Finished")
  )
  console.log(
    "scroll:",
    await page.$eval(".bench-result", (e) => e.textContent)
  )
  await mkdir("/tmp/chat-rendering-checks", { recursive: true })
  await page.screenshot({
    path: "/tmp/chat-rendering-checks/desktop.png",
    fullPage: true,
  })
  for (const label of ["Jump", "Latest", "Stream", "Resize", "Reopen"]) {
    await page.evaluate(
      (label) =>
        [...document.querySelectorAll<HTMLButtonElement>(".bench-tabs button")]
          .find((b) => b.textContent === label)!
          .click(),
      label
    )
    await page.click(".bench-run")
    await page.waitForFunction(
      () =>
        document
          .querySelector('[role="status"]')
          ?.textContent?.startsWith("Finished"),
      { timeout: 45000 }
    )
    console.log(label, await page.$eval(".bench-result", (e) => e.textContent))
  }
  await page.click(".bench-compare input")
  await page.waitForFunction(
    () =>
      document.querySelectorAll("iframe").length === 2 &&
      !document.querySelector<HTMLButtonElement>(".bench-run")?.disabled
  )
  await page.evaluate(() =>
    [...document.querySelectorAll<HTMLButtonElement>(".bench-tabs button")]
      .find((button) => button.textContent === "Jump")!
      .click()
  )
  await page.click(".bench-run")
  await page.waitForFunction(() =>
    document
      .querySelector('[role="status"]')
      ?.textContent?.startsWith("Finished")
  )
  assert.equal(
    await page.$$eval(
      ".bench-comparison-readings thead th",
      (columns) => columns.length
    ),
    2
  )
  assert.ok(
    await page.$$eval(".bench-surface", (surfaces) =>
      surfaces.every(
        (surface) =>
          Math.abs(
            surface.getBoundingClientRect().bottom -
              surface
                .querySelector(".bench-surface-footer")!
                .getBoundingClientRect().bottom
          ) < 2
      )
    ),
    "results must not stretch chat surfaces below their footers"
  )
  await page.screenshot({
    path: "/tmp/chat-rendering-checks/compare.png",
    fullPage: true,
  })
  await page.setViewport({ width: 390, height: 844 })
  await new Promise((r) => setTimeout(r, 800))
  const overflow = await page.evaluate(
    () => document.querySelector(".bench-page")!.scrollWidth > innerWidth
  )
  assert.equal(overflow, false, "mobile page should fit the viewport")
  await page.screenshot({
    path: "/tmp/chat-rendering-checks/mobile.png",
    fullPage: true,
  })
  for (const route of ["/results"]) {
    const response = await page.goto(base + route)
    assert.equal(response?.status(), 200, route)
  }
  assert.equal(
    await page.evaluate(async () => (await fetch("/api/results")).status),
    200
  )
  assert.deepEqual(errors, [])
  console.log("UI flows and responsive layout passed")
} finally {
  await browser.close()
}
