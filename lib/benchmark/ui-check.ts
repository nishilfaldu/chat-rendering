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

async function collectReadingTips(page: Page) {
  const rows = await page.$$(".bench-comparison-readings tbody th")
  const tips: Record<string, string | null> = {}
  for (const row of rows) {
    const label = await row.evaluate((node) => node.textContent ?? "")
    const tip = await row.$(".bench-tip")
    if (!tip) {
      tips[label] = null
      continue
    }
    await tip.hover()
    await page.waitForSelector(".bench-tip-bubble")
    tips[label] = await page.$eval(
      ".bench-tip-bubble",
      (node) => node.textContent ?? ""
    )
    await page.mouse.move(0, 0)
    await page.waitForSelector(".bench-tip-bubble", { hidden: true })
  }
  return tips
}

const TAB_LINES: Record<string, string> = {
  Jump: "Jump to message 8,000",
  Reopen: "Open the conversation again",
  Scroll: "Scroll the full history",
  Resize: "Device width changes",
  Stream: "The last reply grows",
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
  assert.equal(
    await page.$eval(".bench-header p", (node) => node.textContent),
    "How to render chat better than just virtualization alone."
  )
  assert.equal(await page.$(".bench-then-run"), null)
  assert.equal(await page.$(".bench-what"), null)
  const homeCopy = await page.$eval(
    ".bench-page",
    (node) => node.textContent ?? ""
  )
  assert.doesNotMatch(homeCopy, /What this is/)
  assert.doesNotMatch(homeCopy, /THEN RUN/)
  assert.doesNotMatch(homeCopy, /No virtualization/)
  assert.doesNotMatch(homeCopy, /Content-type guess/)
  assert.doesNotMatch(homeCopy, /Every message/)
  assert.doesNotMatch(homeCopy, /Height sources/)
  assert.doesNotMatch(homeCopy, /height sources/)
  assert.doesNotMatch(homeCopy, /\bBaseline\b/)
  assert.doesNotMatch(homeCopy, /Every pane anchors/)
  assert.doesNotMatch(homeCopy, /Drift should stay/)
  assert.equal(
    await page.$eval(".bench-instruction p", (node) => node.textContent),
    "Jump to message 8,000"
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
    await page.$eval(
      '.bench-tabs button[aria-pressed="true"]',
      (node) => node.textContent
    ),
    "Jump"
  )
  assert.deepEqual(
    await page.$$eval(".bench-picker-value", (nodes) =>
      nodes.map((node) => node.textContent)
    ),
    ["TanStack Virtual", "Precomputed (fetched from server)"]
  )
  assert.equal(
    await page.$$eval(
      ".bench-inspector button, .bench-inspector select",
      (controls) => controls.length
    ),
    0
  )
  await page.click(".bench-picker-trigger")
  await page.waitForSelector(".bench-picker.is-open .bench-picker-item-label")
  assert.equal(await page.$(".bench-picker-group-label"), null)
  assert.deepEqual(
    await page.$$eval(
      ".bench-picker.is-open .bench-picker-item-label",
      (nodes) => nodes.map((node) => node.textContent)
    ),
    [
      "TanStack Virtual",
      "Browser cache (IndexedDB)",
      "Precomputed (fetched from server)",
      "Precomputed + baked HTML",
    ]
  )
  assert.equal(await page.$(".bench-picker-item-desc"), null)
  const baked = await page.$(
    ".bench-picker.is-open .bench-picker-item-label .bench-tip"
  )
  assert.ok(baked)
  await baked.hover()
  await page.waitForSelector(".bench-tip-bubble")
  assert.equal(
    await page.$eval(".bench-tip-bubble", (node) => node.textContent),
    "Prerendered message HTML."
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
  assert.equal(await page.$(".bench-interpretation"), null)
  assert.equal(await page.$(".bench-cost-lines"), null)
  assert.deepEqual(
    await page.$$eval(".bench-comparison-readings thead th", (nodes) =>
      nodes.map((node) => node.textContent)
    ),
    ["TanStack Virtual", "Precomputed (fetched from server)"]
  )
  const payloadRow = await page.$$eval(
    ".bench-comparison-readings tbody tr",
    (rows) => {
      const row = rows.find((candidate) =>
        (candidate.querySelector("th")?.textContent ?? "").includes("Payload")
      )
      return row
        ? {
            label: row.querySelector("th")?.textContent,
            values: [...row.querySelectorAll("td")].map(
              (cell) => cell.textContent
            ),
          }
        : null
    }
  )
  assert.deepEqual(payloadRow, {
    label: "Payload, gzipped KB",
    values: ["258", "1,077"],
  })
  const extraRow = await page.$$eval(
    ".bench-comparison-readings tbody tr",
    (rows) =>
      rows.some((candidate) =>
        (candidate.querySelector("th")?.textContent ?? "").includes(
          "Extra payload"
        )
      )
  )
  assert.equal(extraRow, false)
  const resultCopy = await page.$eval(
    ".bench-result",
    (node) => node.textContent ?? ""
  )
  assert.doesNotMatch(resultCopy, /Cost:/)
  assert.doesNotMatch(resultCopy, /Left pane/)
  assert.doesNotMatch(resultCopy, /Right pane/)
  assert.doesNotMatch(resultCopy, /Extra payload/)
  const jumpTips = await collectReadingTips(page)
  assert.deepEqual(jumpTips, {
    "Layout fixed after mount": "Pixels corrected after rows mounted.",
    "Rows re-measured": null,
    "Jump time": null,
    "Position drift": "Movement of the target after the jump.",
    "Landing offset": "Distance from the intended top edge.",
    "Payload, gzipped KB": null,
  })
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
    assert.equal(
      await page.$eval(".bench-instruction p", (node) => node.textContent),
      TAB_LINES[label]
    )
    await page.waitForFunction(
      () => !document.querySelector<HTMLButtonElement>(".bench-run")?.disabled
    )
    await page.click(".bench-run")
    await page.waitForFunction(
      () => document.querySelector<HTMLButtonElement>(".bench-run")?.disabled
    )
    if (label === "Stream") {
      await new Promise((resolve) => setTimeout(resolve, 120))
      const bounds = await (await page.$(
        ".bench-chat-wrap iframe"
      ))!.boundingBox()
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
      { timeout: 90_000 }
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
    assert.doesNotMatch(
      await page.$eval(".bench-result", (node) => node.textContent ?? ""),
      /Left pane|Right pane/
    )
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
  const notes = await page.$eval("article", (node) => node.textContent ?? "")
  assert.deepEqual(
    await page.$$eval("article h2", (nodes) =>
      nodes.map((node) => node.textContent)
    ),
    [
      "TanStack Virtual",
      "Browser cache (IndexedDB)",
      "Precomputed (fetched from server)",
      "Precomputed + baked HTML",
    ]
  )
  assert.match(notes, /IndexedDB/)
  assert.match(notes, /stores measured heights/)
  assert.match(notes, /ship with the page/)
  assert.doesNotMatch(notes, /CACHE_REVISION/)
  assert.doesNotMatch(notes, /binary search/i)
  assert.doesNotMatch(notes, /offset tables/)
  assert.doesNotMatch(notes, /fonts or layout/)
  assert.doesNotMatch(notes, /Extra payload/)
  assert.doesNotMatch(notes, /\+819 KB/)
  assert.doesNotMatch(notes, /Left pane/)
  assert.doesNotMatch(notes, /Right pane/)
  assert.doesNotMatch(notes, /Reading the numbers/)
  assert.doesNotMatch(notes, /How to read the numbers/)
  assert.doesNotMatch(notes, /What every pane shares/)
  assert.doesNotMatch(notes, /The baseline you already have/)
  assert.doesNotMatch(notes, /Choosing/)
  assert.doesNotMatch(notes, /\bControls\b/)
  assert.doesNotMatch(notes, /Height sources/)
  assert.equal(await page.$$eval("article ul", (nodes) => nodes.length), 4)
  assert.equal(
    await page.$$eval(
      "nav[aria-label='On this page'], aside.sidebar, .sidebar",
      (nodes) => nodes.length
    ),
    0
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
