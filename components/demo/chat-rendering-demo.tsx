"use client"

import { useEffect, useRef, useState } from "react"
import {
  IMPLEMENTATIONS,
  conversationPath,
  type ChatAppId,
} from "@/lib/chat-implementations"
import { ArrowDown, ArrowUpRight, Check, Play, Square } from "lucide-react"

import { ImplementationPicker } from "./implementation-picker"
import {
  formatReading,
  initialReading,
  scrollOf,
  type Reading,
} from "./iframe-probe"
import { runExperiment, type CurrentRun } from "./run-experiment"
import { ComparisonReadings, SingleRunReadings } from "./run-readings"
import { SCENARIOS, type Scenario } from "./scenarios"

export function ChatRenderingDemo() {
  const refs = [
    useRef<HTMLIFrameElement>(null),
    useRef<HTMLIFrameElement>(null),
  ]
  const [modes, setModes] = useState<[ChatAppId, ChatAppId]>([
    "saved-measurements",
    "measured",
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
  const selected = SCENARIOS.find((item) => item.id === scenario)!
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
    try {
      const results = await runExperiment({
        scenario,
        modes,
        frames,
        refs,
        cancelled,
        setRevision,
        setReadings,
        setNarrow,
        setMarked,
      })
      if (!cancelled.current) {
        setCurrentRun({ scenario, results })
        setStatus("Finished.")
      } else {
        setStatus(
          "Stopped. Run the experiment again for a complete measurement."
        )
      }
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "The experiment could not finish. Reopen the surface and try again."
      )
    } finally {
      setBusy(false)
    }
  }

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
              {SCENARIOS.map((item) => (
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
                    IMPLEMENTATIONS[mode].label ?? `Conversation ${index + 1}`
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
                      title={`${IMPLEMENTATIONS[mode].label} conversation`}
                      src={`${conversationPath(mode)}?run=${revision}`}
                    />
                    {marked ? (
                      <div className="bench-anchor" aria-hidden="true">
                        <span>Message 8,000</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="bench-surface-footer">
                    <span>
                      {formatReading(
                        readings[index]?.snapshot?.messageCount,
                        " messages",
                        0
                      )}
                    </span>
                    <span>
                      {formatReading(readings[index]?.mounted, " mounted", 0)}
                    </span>
                    <span>
                      {formatReading(readings[index]?.width, " px", 0)}
                    </span>
                    <button
                      disabled={busy || !ready}
                      aria-label={`Jump to latest in conversation ${index + 1}`}
                      onClick={() =>
                        void refs[
                          index
                        ]?.current?.contentWindow?.__RAILGUN_BENCH__?.commands.jump(
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
                  <SingleRunReadings run={currentRun} />
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
