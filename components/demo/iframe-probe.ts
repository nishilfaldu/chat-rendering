import type { BenchSnapshot } from "@/lib/bench"
import type { ChatAppId } from "@/lib/chat-implementations"

export type Reading = {
  snapshot: BenchSnapshot | null
  mounted: number
  width: number
}

export type RunResult = {
  mode: ChatAppId
  elapsed: number
  frameP95: number | null
  longestFrame: number | null
  peakDrift: number | null
  drift: number | null
  landing: number | null
  mounted: number | null
  corrections: number
  correctedPx: number
}

export const initialReading: Reading = {
  snapshot: null,
  mounted: 0,
  width: 0,
}

export const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

export const nextFrame = () =>
  new Promise<number>((resolve) => requestAnimationFrame(resolve))

export function scrollOf(frame: HTMLIFrameElement | null) {
  return (
    frame?.contentDocument?.querySelector<HTMLElement>("[data-chat-scroll]") ??
    null
  )
}

export function formatReading(
  value: number | null | undefined,
  unit = "",
  digits = 1
) {
  return value == null
    ? "—"
    : `${value.toLocaleString(undefined, { maximumFractionDigits: digits })}${unit}`
}

export function firstVisible(scroll: HTMLElement) {
  const top = scroll.getBoundingClientRect().top
  return (
    [...scroll.querySelectorAll<HTMLElement>("[data-message-id]")].find(
      (row) =>
        row.getBoundingClientRect().bottom > top + 1 &&
        row.getBoundingClientRect().top < scroll.getBoundingClientRect().bottom
    ) ?? null
  )
}

export function track(frame: HTMLIFrameElement, mode: ChatAppId) {
  const scroll = scrollOf(frame)!
  const times: number[] = []
  let last: number | null = null,
    raf = 0
  const win = frame.contentWindow!
  const initial = win.__RAILGUN_BENCH__!.snapshot
  const tick = (now: number) => {
    if (last !== null) times.push(now - last)
    last = now
    raf = win.requestAnimationFrame(tick)
  }
  raf = win.requestAnimationFrame(tick)
  const started = performance.now()
  return () => {
    win.cancelAnimationFrame(raf)
    times.sort((a, b) => a - b)
    return {
      mode,
      mounted: scroll.querySelectorAll("[data-message-id]").length,
      corrections:
        win.__RAILGUN_BENCH__!.snapshot.correctionCount -
        initial.correctionCount,
      correctedPx:
        win.__RAILGUN_BENCH__!.snapshot.correctedPx - initial.correctedPx,
      elapsed: performance.now() - started,
      frameP95: times.length
        ? times[Math.ceil(times.length * 0.95) - 1]!
        : null,
      longestFrame: times.at(-1) ?? null,
      peakDrift: null,
      drift: null,
      landing: null,
    } as RunResult
  }
}
