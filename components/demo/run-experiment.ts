import type { ChatAppId } from "@/lib/chat-implementations"

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
  try {
    if (scenario === "reopen") {
      const started = performance.now()
      const documents = frames.map((frame) => frame.contentDocument)
      setReadings([initialReading, initialReading])
      setRevision((value) => value + 1)
      const pending = new Set(frames.map((_, index) => index))
      while (
        pending.size &&
        performance.now() - started < 30_000 &&
        !cancelled.current
      ) {
        await delay(50)
        for (const index of pending) {
          const frame = refs[index]?.current
          const snapshot = frame?.contentWindow?.__RAILGUN_BENCH__?.snapshot
          if (
            frame &&
            frame.contentDocument !== documents[index] &&
            snapshot?.messageCount &&
            snapshot.firstPaintMs !== null
          ) {
            results.push({
              mode: modes[index]!,
              mounted: scrollOf(frame)?.querySelectorAll("*").length ?? null,
              corrections: snapshot.correctionCount,
              correctedPx: snapshot.correctedPx,
              elapsed: performance.now() - started,
              frameP95: null,
              drift: null,
              landing: null,
            })
            pending.delete(index)
          }
        }
      }
      if (pending.size && !cancelled.current)
        throw new Error(
          "The surface did not finish reopening within 30 seconds."
        )
      return results
    }

    if (scenario === "latest")
      await Promise.all(
        frames.map((frame) =>
          frame.contentWindow!.__RAILGUN_BENCH__!.commands.jump(8000)
        )
      )
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
    } else if (scenario === "jump" || scenario === "latest") {
      const index = scenario === "latest" ? 9999 : 8000
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
            return scenario === "latest"
              ? row.getBoundingClientRect().bottom -
                  scroll.getBoundingClientRect().bottom
              : row.getBoundingClientRect().top -
                  scroll.getBoundingClientRect().top
          }
          const origin = offset()
          let drift: number | null = origin === null ? null : 0
          for (let i = 0; i < 24 && !cancelled.current; i++) {
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
      await Promise.all(
        frames.map((frame) =>
          frame.contentWindow!.__RAILGUN_BENCH__!.commands.streamLast()
        )
      )
    } else if (scenario === "resize") {
      const anchors = frames.map((frame) => {
        const scroll = scrollOf(frame)!
        const row = firstVisible(scroll)
        return {
          id: row?.dataset.messageId,
          top: row
            ? row.getBoundingClientRect().top -
              scroll.getBoundingClientRect().top
            : null,
        }
      })
      setNarrow((value) => !value)
      await delay(900)
      frames.forEach((frame, pane) => {
        const scroll = scrollOf(frame)!
        const anchor = anchors[pane]!
        const row = anchor.id
          ? scroll.querySelector<HTMLElement>(
              `[data-message-id="${anchor.id}"]`
            )
          : null
        const result = finishers[pane]!()
        result.drift =
          row && anchor.top !== null
            ? Math.abs(
                row.getBoundingClientRect().top -
                  scroll.getBoundingClientRect().top -
                  anchor.top
              )
            : null
        results[pane] = result
      })
    }
    if (!results.length) finishers.forEach((finish) => results.push(finish()))
    return results
  } finally {
    finishers.forEach((finish) => finish())
  }
}
