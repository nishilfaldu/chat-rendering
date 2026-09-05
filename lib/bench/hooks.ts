"use client"

import { useEffect } from "react"
import { useBench } from "./use-bench.tsx"

export function useDomNodeCount(element: HTMLElement | null): void {
  const { setDomNodes } = useBench()

  useEffect(() => {
    if (!element) return
    let last = -1
    const tick = () => {
      const count = element.querySelectorAll("*").length
      if (count === last) return
      last = count
      setDomNodes(count)
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => {
      window.clearInterval(id)
    }
  }, [element, setDomNodes])
}

export function useBenchSession(input: {
  root: HTMLElement | null
  scroll: HTMLElement | null
  messageCount: number
}): void {
  const { setMessageCount } = useBench()
  useDomNodeCount(input.root)

  useEffect(() => {
    setMessageCount(input.messageCount)
  }, [input.messageCount, setMessageCount])
}

export async function timeJump(
  run: () => void | Promise<void>
): Promise<number> {
  const start = performance.now()
  await run()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
  return performance.now() - start
}

export async function convergeVirtualJump(input: {
  scrollElement: HTMLElement
  rowIndex: number
  scroll: () => void
  maxFrames?: number
  align?: "start" | "end"
}): Promise<void> {
  let alignedFrames = 0
  const maxFrames = input.maxFrames ?? 12
  for (let frame = 0; frame < maxFrames; frame += 1) {
    input.scroll()
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    const row = input.scrollElement.querySelector<HTMLElement>(
      `[data-index="${input.rowIndex}"]`
    )
    if (!row) {
      alignedFrames = 0
      continue
    }
    const error =
      input.align === "end"
        ? row.getBoundingClientRect().bottom -
          input.scrollElement.getBoundingClientRect().bottom
        : row.getBoundingClientRect().top -
          input.scrollElement.getBoundingClientRect().top
    alignedFrames = Math.abs(error) <= 0.75 ? alignedFrames + 1 : 0
    if (alignedFrames >= 2) return
  }
  input.scroll()
}
