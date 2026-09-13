import type { ChatAppId } from "@/lib/chat-implementations"

import { trackReadingPosition } from "./position-probe"

import type { Scenario } from "./scenarios"
import {
  delay,
  firstVisible,
  initialReading,
  nextFrame,
  scrollOf,
  track,
  type Reading,
  type RunResult,
} from "./iframe-probe"

export type CurrentRun = { scenario: Scenario; results: RunResult[] }

export async function runExperiment({
  scenario,
  modes,
  frames,
  refs,
  cancelled,
  setRevision,
  setReadings,
  setNarrow,
  setMarked,
}: {
  scenario: Scenario
  modes: ChatAppId[]
  frames: HTMLIFrameElement[]
  refs: Array<{ current: HTMLIFrameElement | null }>
  cancelled: { current: boolean }
  setRevision: (update: (value: number) => number) => void
  setReadings: (value: Reading[]) => void
  setNarrow: (update: (value: boolean) => boolean) => void
  setMarked: (value: boolean) => void
}): Promise<RunResult[]> {
  const results: RunResult[] = []
  const finishers: ReturnType<typeof track>[] = []
  const positionFinishers: ReturnType<typeof trackReadingPosition>[] = []
  try {
    if (scenario === "reopen") {
      const started = performance.now()
      const documents = frames.map((frame) => frame.contentDocument)
      setReadings([initialReading, initialReading])
      setRevision((value) => value + 1)
      const appeared = new Map<number, Document>()
      const pending = new Set(frames.map((_, index) => index))
      while (
        pending.size &&
        performance.now() - started < 30_000 &&
        !cancelled.current
      ) {
        await nextFrame()
        for (const index of pending) {
          const frame = refs[index]?.current
          const snapshot = frame?.contentWindow?.__RAILGUN_BENCH__?.snapshot
          const scroll = scrollOf(frame ?? null)
          const visible = scroll ? firstVisible(scroll) : null
          if (
            frame &&
            frame.contentDocument !== documents[index] &&
            snapshot?.messageCount &&
            snapshot.firstPaintMs !== null &&
            visible?.querySelector("[data-message-body]") &&
            !visible.querySelector("[data-content-pending]")
          ) {
            // Observe content across two frames to allow a paint between checks.
            if (appeared.get(index) !== frame.contentDocument) {
              appeared.set(index, frame.contentDocument!)
              continue
            }
            results[index] = {
              mode: modes[index]!,
              mounted:
                scrollOf(frame)?.querySelectorAll("[data-message-id]").length ??
                null,
              corrections: snapshot.correctionCount,
              correctedPx: snapshot.correctedPx,
              elapsed: performance.now() - started,
              frameP95: null,
              longestFrame: null,
              peakDrift: null,
              drift: null,
              landing: null,
            }
            pending.delete(index)
          } else {
            appeared.delete(index)
          }
        }
      }
      if (pending.size && !cancelled.current)
        throw new Error("The pane did not finish reopening within 30 seconds.")
      return results
    }

    frames.forEach((frame, index) =>
      finishers.push(track(frame, modes[index]!))
    )
    if (scenario === "scroll") {
      await Promise.all(
        frames.map(
          (frame) =>
            new Promise<void>((resolve) => {
              const win = frame.contentWindow!
              const started = win.performance.now()
              const tick = (now: number) => {
                const progress = Math.min(1, (now - started) / 1800)
                const distance =
                  progress < 0.5 ? progress * 2 : (1 - progress) * 2
                const scroll = scrollOf(frame)!
                scroll.scrollTop =
                  (1 - distance * 0.85) *
                  Math.max(0, scroll.scrollHeight - scroll.clientHeight)
                if (progress === 1 || cancelled.current) resolve()
                else win.requestAnimationFrame(tick)
              }
              win.requestAnimationFrame(tick)
            })
        )
      )
      if (!cancelled.current)
        await Promise.all(
          frames.map((frame) =>
            frame.contentWindow!.__RAILGUN_BENCH__!.commands.jump(9999)
          )
        )
      await delay(200)
    } else if (scenario === "jump") {
      const index = 8000
      await Promise.all(
        frames.map(async (frame, pane) => {
          const started = performance.now()
          await frame.contentWindow!.__RAILGUN_BENCH__!.commands.jump(index)
          const arrival = performance.now() - started
          const scroll = scrollOf(frame)!
          const offset = () => {
            const row =
              scroll.querySelector<HTMLElement>(`[data-index="${index}"]`) ??
              scroll.querySelector<HTMLElement>(
                `[data-message-id="msg_${String(index).padStart(5, "0")}"]`
              )
            if (!row) return null
            return (
              row.getBoundingClientRect().top -
              scroll.getBoundingClientRect().top
            )
          }
          const origin = offset()
          let drift: number | null = origin === null ? null : 0
          const observationStart = performance.now()
          while (
            performance.now() - observationStart < 400 &&
            !cancelled.current
          ) {
            await nextFrame()
            const position = offset()
            if (position !== null && origin !== null)
              drift = Math.max(drift ?? 0, Math.abs(position - origin))
          }
          const result = finishers[pane]!()
          result.elapsed = arrival
          result.drift = drift
          result.landing = offset() === null ? null : Math.abs(offset()!)
          results[pane] = result
        })
      )
      setMarked(scenario === "jump")
    } else if (scenario === "stream") {
      frames.forEach((frame) =>
        positionFinishers.push(trackReadingPosition(scrollOf(frame)!, true))
      )
      await Promise.all(
        frames.map((frame, pane) =>
          frame
            .contentWindow!.__RAILGUN_BENCH__!.commands.streamLast()
            .then(() => {
              const result = finishers[pane]!()
              result.drift = positionFinishers[pane]!().peak
              results[pane] = result
            })
        )
      )
    } else if (scenario === "resize") {
      frames.forEach((frame) =>
        positionFinishers.push(trackReadingPosition(scrollOf(frame)!))
      )
      setNarrow((value) => !value)
      await delay(900)
      frames.forEach((_frame, pane) => {
        const position = positionFinishers[pane]!()
        const result = finishers[pane]!()
        result.drift = position.shift
        result.peakDrift = position.peak
        results[pane] = result
      })
    }
    if (!results.length) finishers.forEach((finish) => results.push(finish()))
    return results
  } finally {
    positionFinishers.forEach((finish) => finish())
    finishers.forEach((finish) => finish())
  }
}
