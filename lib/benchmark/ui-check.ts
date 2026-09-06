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
  assert.equal(
    await page.$$eval(
      ".bench-inspector button, .bench-inspector select",
      (controls) => controls.length
    ),
    0
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
    "scroll:",
    await page.$eval(".bench-result", (e) => e.textContent)
  )
  assert.equal(
    await page.$eval(".bench-primary-reading dt", (node) => node.textContent),
    "Frame interval p95"
  )
  assert.equal(
    await page.$eval(".bench-rendering-details", (node) =>
      node.hasAttribute("open")
    ),
    true
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
      { timeout: 45_000 }
    )
    const expected = {
      Jump: "Jump time",
      Latest: "Jump time",
      Stream: "Frame interval p95",
      Resize: "Position shift after resize",
      Reopen: "Time to appear",
    }[label]
    assert.equal(
      await page.$eval(".bench-primary-reading dt", (node) => node.textContent),
      expected
    )
    if (label === "Stream") {
      const drift = await page.$$eval(
        ".bench-result dl > div",
        (rows) =>
          rows
            .find(
              (row) =>
                row.querySelector("dt")?.textContent ===
                "Reading-position drift"
            )
            ?.querySelector("dd")?.textContent
      )
      assert.ok(
        drift?.includes("px"),
        "pausing in the history during streaming should produce a reading-position measurement"
      )
    }
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
