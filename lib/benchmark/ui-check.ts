import assert from "node:assert/strict"
import puppeteer, { type Page } from "puppeteer-core"
import { chromeExecutable } from "@/lib/seed/browser-harness"
import { mkdir } from "node:fs/promises"

const browser = await puppeteer.launch({
  executablePath: chromeExecutable(),
  headless: true,
  args: ["--no-sandbox"],
})
const base = process.env.CHECK_URL ?? "http://localhost:3000"

async function firstReadingLabel(page: Page) {
  return page.evaluate(() => {
    const row = document.querySelector(
      ".bench-comparison-readings tbody tr th, .bench-primary-reading dt"
    )
    return row?.textContent ?? null
  })
}

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
  assert.equal(
    await page.$eval("h1", (node) => node.textContent),
    "Chat rendering"
  )
  assert.match(
    await page.$eval(".bench-header p", (node) => node.textContent ?? ""),
    /TanStack Virtual/
  )
  assert.equal(
    await page.$eval(".bench-docs-link", (node) => node.textContent),
    "Notes"
  )
  assert.equal(
    await page.$eval(".bench-compare input", (node) =>
      (node as HTMLInputElement).checked ? "on" : "off"
    ),
    "on"
  )
  assert.deepEqual(
    await page.$$eval(".bench-tabs button", (buttons) =>
      buttons.map((button) => button.textContent)
    ),
    ["Jump", "Reopen", "Scroll", "Resize", "Stream"]
  )
  assert.equal(
    await page.$eval('.bench-tabs button[aria-pressed="true"]', (node) =>
      node.textContent
    ),
    "Jump"
  )
  assert.deepEqual(
    await page.$$eval(".bench-picker-value", (nodes) =>
      nodes.map((node) => node.textContent)
    ),
    [
      "TanStack Virtual, measured after mount",
      "Heights measured on the server",
    ]
  )
  assert.equal(
    await page.$$eval(
      ".bench-inspector button, .bench-inspector select",
      (controls) => controls.length
    ),
    0
  )
  await page.click(".bench-picker-trigger")
  await page.waitForSelector(".bench-picker.is-open .bench-picker-group-label")
  assert.deepEqual(
    await page.$$eval(".bench-picker.is-open .bench-picker-group-label", (nodes) =>
      nodes.map((node) => node.textContent)
    ),
    ["Baseline", "Height sources", "Controls"]
  )
  assert.match(
    await page.$eval(
      ".bench-picker.is-open button[aria-selected='true'] .bench-picker-item-desc",
      (node) => node.textContent ?? ""
    ),
    /80 px guess/
  )
  await page.click("h1")

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
  console.log("jump:", await page.$eval(".bench-result", (e) => e.textContent))
  assert.equal(await firstReadingLabel(page), "Layout fixed after mount")
  assert.match(
    await page.$eval(".bench-interpretation", (node) => node.textContent ?? ""),
    /Same landing, different bill/
  )
  assert.match(
    await page.$eval(".bench-cost-lines", (node) => node.textContent ?? ""),
    /\+819 KB payload \(gz\).*200,000 precomputed heights/s
  )
  await mkdir("/tmp/chat-rendering-checks", { recursive: true })
  await page.screenshot({
    path: "/tmp/chat-rendering-checks/desktop.png",
    fullPage: true,
  })

  for (const label of ["Reopen", "Scroll", "Resize", "Stream"]) {
    await page.evaluate(
      (label) =>
        [...document.querySelectorAll<HTMLButtonElement>(".bench-tabs button")]
          .find((b) => b.textContent === label)!
          .click(),
      label
    )
    await page.click(".bench-run")
    await page.waitForFunction(
      () => document.querySelector<HTMLButtonElement>(".bench-run")?.disabled
    )
    if (label === "Stream") {
      await new Promise((resolve) => setTimeout(resolve, 120))
      const bounds = await (await page.$(".bench-chat-wrap iframe"))!.boundingBox()
      await page.mouse.move(
        bounds!.x + bounds!.width / 2,
        bounds!.y + bounds!.height / 2
      )
      await page.mouse.wheel({ deltaY: -350 })
    }
    await page.waitForFunction(
      () =>
        Boolean(
          document.querySelector(
            ".bench-primary-reading, .bench-comparison-readings"
          )
        ) && !document.querySelector(".bench-measuring"),
      { timeout: 45_000 }
    )
    assert.equal(await firstReadingLabel(page), "Layout fixed after mount")
    if (label === "Stream") {
      const drift = await page.$$eval(
        ".bench-comparison-readings tbody tr, .bench-result dl > div",
        (rows) =>
          rows
            .find((row) =>
              (row.querySelector("th, dt")?.textContent ?? "").includes(
                "Reading-position drift"
              )
            )
            ?.querySelector("td, dd")?.textContent
      )
      assert.ok(
        drift?.includes("px"),
        "pausing in the history during streaming should produce a reading-position measurement"
      )
    }
    console.log(label, await page.$eval(".bench-result", (e) => e.textContent))
  }

  assert.equal(
    await page.$$eval(
      ".bench-result > .bench-comparison-readings thead th",
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

  await page.goto(`${base}/docs`)
  await page.waitForSelector("h1")
  assert.equal(await page.$eval("h1", (node) => node.textContent), "Notes")
  assert.match(
    await page.$eval("article", (node) => node.textContent ?? ""),
    /The baseline you already have/
  )
  assert.doesNotMatch(
    await page.$eval("article", (node) => node.textContent ?? ""),
    /From a message to pixels/
  )

  await page.goto(base)
  await page.waitForFunction(
    () => !document.querySelector<HTMLButtonElement>(".bench-run")?.disabled
  )
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
  assert.deepEqual(errors, [])
  console.log("UI flows and responsive layout passed")
} finally {
  await browser.close()
}
