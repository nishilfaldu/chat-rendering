import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import puppeteer from "puppeteer-core"
import ts from "typescript"
import { chromeExecutable } from "@/lib/seed/browser-harness"

const source = await readFile(
  new URL("../../components/demo/position-probe.ts", import.meta.url),
  "utf8"
)
const script = ts
  .transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  })
  .outputText.replace(/^export /gm, "")
const browser = await puppeteer.launch({
  executablePath: chromeExecutable(),
  headless: true,
})
try {
  const page = await browser.newPage()
  await page.setContent(
    '<div id="scroll" style="height:200px;overflow:auto;position:relative"><div style="height:1200px"><article data-message-id="a" style="height:100px">Reading anchor</article><article data-message-id="b" style="height:1000px">More content</article></div></div>'
  )
  await page.addScriptTag({
    content: "globalThis.__name = target => target;\n" + script,
  })
  const result = await page.evaluate(async () => {
    const probe = (
      window as unknown as {
        trackReadingPosition: (
          element: HTMLElement,
          streaming?: boolean
        ) => () => { shift: number | null; peak: number | null }
      }
    ).trackReadingPosition
    const scroll = document.querySelector<HTMLElement>("#scroll")!
    const row = document.querySelector<HTMLElement>("article")!
    const wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms))
    const resize = probe(scroll)
    row.style.transform = "translateY(12px)"
    await wait(70)
    row.style.transform = ""
    await wait(70)
    const resizeResult = resize()
    scroll.scrollTop = scroll.scrollHeight
    const pinned = probe(scroll, true)
    await wait(70)
    const pinnedResult = pinned()
    scroll.scrollTop = 0
    const reading = probe(scroll, true)
    await wait(70)
    scroll.dispatchEvent(new WheelEvent("wheel", { deltaY: 20 }))
    scroll.scrollTop = 20
    await wait(230)
    const beforeShift = row.style.transform
    row.style.transform = "translateY(9px)"
    await wait(70)
    const readingResult = reading()
    row.style.transform = beforeShift
    const lost = probe(scroll)
    row.remove()
    await wait(70)
    return { resizeResult, pinnedResult, readingResult, lostResult: lost() }
  })
  assert.deepEqual(
    result.resizeResult,
    { shift: 0, peak: 12 },
    "capture temporary shifts even after recovery"
  )
  assert.deepEqual(
    result.pinnedResult,
    { shift: null, peak: null },
    "following the tail is not a stationary reading sample"
  )
  assert.equal(
    result.readingResult.peak,
    9,
    "exclude deliberate scrolling but detect later drift"
  )
  assert.equal(
    result.lostResult.peak,
    null,
    "lost anchors must not report zero movement"
  )
  console.log("Position measurements passed", result)
} finally {
  await browser.close()
}
