"use client"

import { useEffect, useRef, useState } from "react"
import type { BenchSnapshot } from "@chat-surface-bench/bench"
import { APP_LINKS, type ChatAppId } from "@workspace/ui/components/chat-frame"
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronDown,
  Play,
  Square,
} from "lucide-react"

const scenarios = [
  {
    id: "scroll",
    label: "Scroll",
    description:
      "Scroll through the history and back. Watch for empty space and delayed frames.",
  },
  {
    id: "jump",
    label: "Jump",
    description:
      "Jump to message 8,000. Measure arrival time and whether the message moves after landing.",
  },
  {
    id: "latest",
    label: "Latest",
    description:
      "Start deep in the history, then jump to the final response. Content fetching is included.",
  },
  {
    id: "stream",
    label: "Stream",
    description:
      "Replay the final response. Scroll away while it streams to check that your reading position holds.",
  },
  {
    id: "resize",
    label: "Resize",
    description:
      "Change the conversation width. Check whether the same message stays in the same place.",
  },
  {
    id: "reopen",
    label: "Reopen",
    description:
      "Open a fresh surface. Saved browser and server measurements remain available.",
  },
] as const

type Scenario = (typeof scenarios)[number]["id"]
type Reading = {
  snapshot: BenchSnapshot | null
  mounted: number
  width: number
}
type RunResult = {
  mode: ChatAppId
  elapsed: number
  frameP95: number | null
  blank: number
  pending: number
  frames: number
  drift: number | null
  landing: number | null
  mounted: number | null
  corrections: number
  correctedPx: number
}
type CurrentRun = { scenario: Scenario; results: RunResult[] }
const initialReading: Reading = { snapshot: null, mounted: 0, width: 0 }
const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))
const nextFrame = () =>
  new Promise<number>((resolve) => requestAnimationFrame(resolve))
const scrollOf = (frame: HTMLIFrameElement | null) =>
  frame?.contentDocument?.querySelector<HTMLElement>("[data-chat-scroll]") ??
  null
const number = (value: number | null | undefined, unit = "", digits = 1) =>
  value == null
    ? "—"
    : `${value.toLocaleString(undefined, { maximumFractionDigits: digits })}${unit}`

function firstVisible(scroll: HTMLElement) {
  const top = scroll.getBoundingClientRect().top
  return (
    [...scroll.querySelectorAll<HTMLElement>("[data-message-id]")].find(
      (row) => row.getBoundingClientRect().bottom > top + 1
    ) ?? null
  )
}

function track(frame: HTMLIFrameElement, mode: ChatAppId) {
  const scroll = scrollOf(frame)!
  const times: number[] = []
  let blank = 0,
    pending = 0,
    frames = 0,
    last: number | null = null,
    raf = 0
  const win = frame.contentWindow!
  const initial = win.__RAILGUN_BENCH__!.snapshot
  const tick = (now: number) => {
    if (last !== null) times.push(now - last)
    last = now
    frames++
    const viewport = scroll.getBoundingClientRect()
    const visible = [
      ...scroll.querySelectorAll<HTMLElement>("[data-message-id]"),
    ].filter((row) => {
      const rect = row.getBoundingClientRect()
      return rect.bottom > viewport.top && rect.top < viewport.bottom
    })
    if (!visible.length) blank++
    if (visible.some((row) => row.querySelector("[data-content-pending]")))
      pending++
    raf = win.requestAnimationFrame(tick)
  }
  raf = win.requestAnimationFrame(tick)
  const started = performance.now()
  return () => {
    win.cancelAnimationFrame(raf)
    times.sort((a, b) => a - b)
    return {
      mode,
      mounted: scroll.querySelectorAll("*").length,
      corrections:
        win.__RAILGUN_BENCH__!.snapshot.correctionCount -
        initial.correctionCount,
      correctedPx:
        win.__RAILGUN_BENCH__!.snapshot.correctedPx - initial.correctedPx,
      elapsed: performance.now() - started,
      frameP95: times.length
        ? times[Math.ceil(times.length * 0.95) - 1]!
        : null,
      blank,
      pending,
      frames,
      drift: null,
      landing: null,
    } as RunResult
  }
}

function ImplementationPicker({
  value,
  open,
  disabled,
  onToggle,
  onChange,
}: {
  value: ChatAppId
  open: boolean
  disabled: boolean
  onToggle: () => void
  onChange: (mode: ChatAppId) => void
}) {
  const selected = APP_LINKS.find((item) => item.id === value)
  return (
    <div
      className={`bench-picker ${open ? "is-open" : ""}`}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="bench-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={onToggle}
      >
        <span className="bench-picker-value">{selected?.label}</span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      <div
        className="bench-picker-menu"
        role="listbox"
        aria-label="Implementation"
      >
        {APP_LINKS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={item.id === value}
            disabled={disabled}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ComparisonReadings({ run }: { run: CurrentRun }) {
  const fields: {
    label: string
    value: (result: RunResult) => string
    visible?: boolean
  }[] = [
    {
      label:
        run.scenario === "reopen"
          ? "Reopen time"
          : run.scenario === "jump" || run.scenario === "latest"
            ? "Arrival time"
            : "Duration",
      value: (result) => number(result.elapsed, " ms", 0),
    },
    {
      label: "Mounted elements at finish",
      value: (result) => number(result.mounted, "", 0),
    },
    {
      label: "Height corrections",
      value: (result) => number(result.corrections, "", 0),
    },
    {
      label: "Total corrected",
      value: (result) => number(result.correctedPx, " px", 0),
    },
    {
      label: "Frame interval p95",
      value: (result) => number(result.frameP95, " ms"),
      visible: run.results.some((result) => result.frameP95 !== null),
    },
    {
      label: "Empty viewport samples",
      value: (result) =>
        result.frames ? `${result.blank} / ${result.frames}` : "—",
      visible: run.results.some((result) => result.frames > 0),
    },
    {
      label: "Content loading samples",
      value: (result) =>
        result.frames ? `${result.pending} / ${result.frames}` : "—",
      visible: run.results.some((result) => result.frames > 0),
    },
    {
      label: "Reading position moved",
      value: (result) => number(result.drift, " px"),
      visible: run.results.some((result) => result.drift !== null),
    },
    {
      label: "Landing error",
      value: (result) => number(result.landing, " px"),
      visible: run.results.some((result) => result.landing !== null),
    },
  ]
  return (
    <table
      className="bench-comparison-readings"
      aria-label="Current run comparison"
    >
      <thead>
        <tr>
          <td />
          {run.results.map((result, index) => (
            <th scope="col" key={index}>
              {APP_LINKS.find((item) => item.id === result.mode)?.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {fields
          .filter((field) => field.visible !== false)
          .map((field) => (
            <tr key={field.label}>
              <th scope="row">{field.label}</th>
              {run.results.map((result, index) => (
                <td key={index}>{field.value(result)}</td>
              ))}
            </tr>
          ))}
      </tbody>
    </table>
  )
}

export function ChatRenderingDemo() {
  const refs = [
    useRef<HTMLIFrameElement>(null),
    useRef<HTMLIFrameElement>(null),
  ]
  const [modes, setModes] = useState<[ChatAppId, ChatAppId]>([
    "server-heights",
    "baseline",
  ])
  const [compare, setCompare] = useState(false)
  const [scenario, setScenario] = useState<Scenario>("scroll")
  const [readings, setReadings] = useState<Reading[]>([
    initialReading,
    initialReading,
  ])
  const [revision, setRevision] = useState(0)
  const [narrow, setNarrow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(
    "Choose an experiment, or scroll through the conversation yourself."
  )
  const [currentRun, setCurrentRun] = useState<CurrentRun | null>(null)
  const [marked, setMarked] = useState(false)
  const [openPicker, setOpenPicker] = useState<0 | 1 | null>(null)
  const cancelled = useRef(false)
  const selected = scenarios.find((item) => item.id === scenario)!
  const count = compare ? 2 : 1

  useEffect(() => {
    const timer = window.setInterval(() => {
      setReadings(
        refs.map((ref) => {
          const scroll = scrollOf(ref.current)
          return {
            snapshot:
              ref.current?.contentWindow?.__RAILGUN_BENCH__?.snapshot ?? null,
            mounted: scroll?.querySelectorAll("[data-message-id]").length ?? 0,
            width: scroll?.clientWidth ?? 0,
          }
        })
      )
    }, 500)
    return () => {
      clearInterval(timer)
      cancelled.current = true
    }
    // Refs remain stable for the lifetime of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (openPicker === null) return
    const close = () => setOpenPicker(null)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    document.addEventListener("click", close)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("click", close)
      document.removeEventListener("keydown", onKey)
    }
  }, [openPicker])

  function stop() {
    cancelled.current = true
    refs.forEach((ref) =>
      ref.current?.contentWindow?.__RAILGUN_BENCH__?.commands.stopStream()
    )
  }

  function changeMode(index: number, mode: ChatAppId) {
    setModes((previous) =>
      index === 0 ? [mode, previous[1]] : [previous[0], mode]
    )
    setReadings((previous) =>
      previous.map((value, i) => (i === index ? initialReading : value))
    )
    setCurrentRun(null)
    setMarked(false)
    setOpenPicker(null)
  }

  // This event handler measures wall-clock time; it is never called during render.
  /* eslint-disable react-hooks/purity */
  async function run() {
    const frames = refs.slice(0, count).map((ref) => ref.current!)
    if (
      frames.some(
        (frame) => !scrollOf(frame) || !frame.contentWindow?.__RAILGUN_BENCH__
      )
    )
      return
    cancelled.current = false
    setBusy(true)
    setCurrentRun(null)
    setMarked(false)
    setStatus(`Running: ${selected.label.toLowerCase()}…`)
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
            const frame = refs[index]!.current
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
                blank: 0,
                pending: 0,
                frames: 0,
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
      } else {
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
                  scroll.querySelector<HTMLElement>(
                    `[data-index="${index}"]`
                  ) ??
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
        if (!results.length)
          finishers.forEach((finish) => results.push(finish()))
      }
      if (!cancelled.current) {
        setCurrentRun({ scenario, results })
        setStatus("Finished.")
      } else
        setStatus(
          "Stopped. Run the experiment again for a complete measurement."
        )
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "The experiment could not finish. Reopen the surface and try again."
      )
    } finally {
      finishers.forEach((finish) => finish())
      setBusy(false)
    }
  }

  /* eslint-enable react-hooks/purity */

  const ready = readings
    .slice(0, count)
    .every((reading) => reading.snapshot?.messageCount)
  return (
    <main className="bench-page">
      <div className="bench-shell">
        <header className="bench-header">
          <div>
            <h1>Chat rendering</h1>
            <p>An experiment in keeping long conversations responsive.</p>
          </div>
          <nav aria-label="Project">
            <a href="/notes">
              How it works <ArrowUpRight size={14} />
            </a>
            <a href="/results">
              Measurements <ArrowUpRight size={14} />
            </a>
          </nav>
        </header>
        <section
          className="bench-workbench"
          aria-label="Chat rendering experiment"
        >
          <div className={`bench-approach ${compare ? "is-comparing" : ""}`}>
            <div className="bench-pickers">
              <ImplementationPicker
                value={modes[0]}
                open={openPicker === 0}
                disabled={busy}
                onToggle={() => setOpenPicker(openPicker === 0 ? null : 0)}
                onChange={(mode) => changeMode(0, mode)}
              />
              {compare ? (
                <>
                  <span className="bench-picker-split" aria-hidden="true" />
                  <ImplementationPicker
                    value={modes[1]}
                    open={openPicker === 1}
                    disabled={busy}
                    onToggle={() => setOpenPicker(openPicker === 1 ? null : 1)}
                    onChange={(mode) => changeMode(1, mode)}
                  />
                </>
              ) : null}
            </div>
            <label className="bench-compare">
              <input
                type="checkbox"
                checked={compare}
                disabled={busy}
                onChange={(event) => {
                  setCompare(event.target.checked)
                  setCurrentRun(null)
                  setOpenPicker(null)
                }}
              />
              Compare
            </label>
          </div>
          <div className="bench-toolbar">
            <div className="bench-tabs" aria-label="Experiment">
              {scenarios.map((item) => (
                <button
                  key={item.id}
                  aria-pressed={scenario === item.id}
                  disabled={busy}
                  onClick={() => {
                    setScenario(item.id)
                    setCurrentRun(null)
                    setMarked(false)
                    setOpenPicker(null)
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="bench-actions">
              <button
                className="bench-run"
                disabled={!ready || busy}
                onClick={run}
              >
                <Play size={13} fill="currentColor" />
                Run {selected.label.toLowerCase()}
              </button>
              {busy ? (
                <button className="bench-stop" onClick={stop}>
                  <Square size={12} />
                  Stop
                </button>
              ) : null}
            </div>
          </div>
          <div className="bench-instruction">
            <p>{selected.description}</p>
          </div>
          <div className={`bench-body ${compare ? "is-comparing" : ""}`}>
            <div className={`bench-surfaces ${compare ? "is-comparing" : ""}`}>
              {modes.slice(0, count).map((mode, index) => (
                <section
                  className="bench-surface"
                  key={index}
                  aria-label={
                    APP_LINKS.find((item) => item.id === mode)?.label ??
                    `Conversation ${index + 1}`
                  }
                >
                  <div
                    className="bench-chat-wrap"
                    style={
                      narrow
                        ? {
                            paddingInline:
                              "clamp(0px, calc((100% - 320px) / 2), 32px)",
                          }
                        : undefined
                    }
                  >
                    <iframe
                      ref={refs[index]}
                      key={`${mode}-${revision}`}
                      title={`${APP_LINKS.find((item) => item.id === mode)?.label} conversation`}
                      src={`/${mode}?embed=1&run=${revision}`}
                    />
                    {marked ? (
                      <div className="bench-anchor" aria-hidden="true">
                        <span>Message 8,000</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="bench-surface-footer">
                    <span>
                      {number(
                        readings[index]?.snapshot?.messageCount,
                        " messages",
                        0
                      )}
                    </span>
                    <span>
                      {number(readings[index]?.mounted, " mounted", 0)}
                    </span>
                    <span>{number(readings[index]?.width, " px", 0)}</span>
                    <button
                      disabled={busy || !ready}
                      aria-label={`Jump to latest in conversation ${index + 1}`}
                      onClick={() =>
                        void refs[
                          index
                        ]!.current?.contentWindow?.__RAILGUN_BENCH__?.commands.jump(
                          9999
                        )
                      }
                    >
                      <ArrowDown size={13} />
                      Latest
                    </button>
                  </div>
                </section>
              ))}
            </div>
            <aside className="bench-inspector">
              <div className="bench-inspector-heading">
                <h2>Current run</h2>
                <span
                  className={`bench-status-dot ${busy ? "is-running" : ""}`}
                />
                <span>
                  {busy
                    ? "Running"
                    : currentRun
                      ? "Finished"
                      : ready
                        ? "Ready"
                        : "Loading"}
                </span>
              </div>
              <div className="bench-result">
                {currentRun && compare ? (
                  <ComparisonReadings run={currentRun} />
                ) : currentRun ? (
                  currentRun.results.map((result, index) => (
                    <div key={index}>
                      {compare && (
                        <h3>
                          {
                            APP_LINKS.find((item) => item.id === result.mode)
                              ?.label
                          }
                        </h3>
                      )}
                      <dl>
                        <div className="bench-primary-reading">
                          <dt>
                            {currentRun.scenario === "reopen"
                              ? "Reopen time"
                              : currentRun.scenario === "jump" ||
                                  currentRun.scenario === "latest"
                                ? "Arrival time"
                                : "Duration"}
                          </dt>
                          <dd>
                            {number(result.elapsed, "", 0)} <span>ms</span>
                          </dd>
                        </div>

                        <div>
                          <dt>Mounted elements at finish</dt>
                          <dd>{number(result.mounted, "", 0)}</dd>
                        </div>
                        <div>
                          <dt>Height corrections</dt>
                          <dd>{number(result.corrections, "", 0)}</dd>
                        </div>
                        <div>
                          <dt>Total corrected</dt>
                          <dd>{number(result.correctedPx, " px", 0)}</dd>
                        </div>
                        {result.frameP95 !== null && (
                          <div>
                            <dt>Frame interval p95</dt>
                            <dd>{number(result.frameP95, " ms")}</dd>
                          </div>
                        )}
                        {result.frames > 0 && (
                          <>
                            <div>
                              <dt>Empty viewport samples</dt>
                              <dd>
                                {result.blank} / {result.frames}
                              </dd>
                            </div>
                            <div>
                              <dt>Content loading samples</dt>
                              <dd>
                                {result.pending} / {result.frames}
                              </dd>
                            </div>
                          </>
                        )}
                        {result.drift !== null && (
                          <div>
                            <dt>Reading position moved</dt>
                            <dd>{number(result.drift, " px")}</dd>
                          </div>
                        )}
                        {result.landing !== null && (
                          <div>
                            <dt>Landing error</dt>
                            <dd>{number(result.landing, " px")}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  ))
                ) : (
                  <p>
                    {busy
                      ? "Measuring…"
                      : "Run an experiment to see its measurements."}
                  </p>
                )}
              </div>
            </aside>
          </div>
          <div className="bench-status" role="status">
            {currentRun ? (
              <Check size={13} />
            ) : (
              <span className="bench-small-dot" />
            )}
            {status}
          </div>
        </section>
      </div>
    </main>
  )
}
