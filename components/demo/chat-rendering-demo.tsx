"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  IMPLEMENTATIONS,
  conversationPath,
  type ChatAppId,
} from "@/lib/chat-implementations"
import { ArrowDown, Play, Square } from "lucide-react"

import { ImplementationPicker } from "./implementation-picker"
import {
  formatReading,
  initialReading,
  scrollOf,
  type Reading,
} from "./iframe-probe"
import { runExperiment, type CurrentRun } from "./run-experiment"
import { ReadingTip } from "./reading-tip"
import { ComparisonReadings, SingleRunReadings } from "./run-readings"
import { SCENARIOS, THEN_RUN, type Scenario } from "./scenarios"

export function ChatRenderingDemo() {
  const refs = [
    useRef<HTMLIFrameElement>(null),
    useRef<HTMLIFrameElement>(null),
  ]
  const [modes, setModes] = useState<[ChatAppId, ChatAppId]>([
    "measured",
    "saved-measurements",
  ])
  const [compare, setCompare] = useState(true)
  const [scenario, setScenario] = useState<Scenario>("jump")
  const [readings, setReadings] = useState<Reading[]>([
    initialReading,
    initialReading,
  ])
  const [revision, setRevision] = useState(0)
  const [narrow, setNarrow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [currentRun, setCurrentRun] = useState<CurrentRun | null>(null)
  const [marked, setMarked] = useState(false)
  const [openPicker, setOpenPicker] = useState<0 | 1 | null>(null)
  const [whatOpen, setWhatOpen] = useState(true)
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
    setRunError(null)
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
    setRunError(null)
    setMarked(false)
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
        setWhatOpen(false)
      } else {
        setRunError("Stopped. Run the bench again for a complete measurement.")
      }
    } catch (error) {
      setRunError(
        error instanceof Error
          ? error.message
          : "The bench could not finish. Reopen the pane and try again."
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
            <p>
              TanStack Virtual can&apos;t know the height of a row it hasn&apos;t
              rendered, so it guesses, mounts, measures, and corrects — on every
              visit, for every reader. This bench keeps the library and moves
              that knowledge earlier: into this browser&apos;s past, onto the
              server, or into prerendered HTML. Then it prices each move.
            </p>
            <p className="bench-subline">
              10,000 messages · the same{" "}
              <code>@tanstack/react-virtual</code>
              {" "}
              setup in every pane but one control · your machine&apos;s numbers,
              not mine.
            </p>
          </div>
          <Link className="bench-docs-link" href="/docs">
            Notes
          </Link>
        </header>
        <details
          className="bench-what"
          open={whatOpen}
          onToggle={(event) => setWhatOpen(event.currentTarget.open)}
        >
          <summary>What this is</summary>
          <p>
            Not a new virtualizer. Every pane here runs{" "}
            <code>useVirtualizer</code> (one control turns it off); only{" "}
            <code>estimateSize</code> and <code>measureElement</code> change.
            What differs is where the height comes from before the row mounts,
            and what that source costs: bytes on the wire, storage writes,
            server precompute, and the risk of a stale height. There is no free
            option, which is the point.
          </p>
        </details>
        <section className="bench-workbench" aria-label="Chat rendering bench">
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
                  setRunError(null)
                  setOpenPicker(null)
                }}
              />
              Compare
            </label>
          </div>
          <div className="bench-toolbar">
            <div className="bench-tabs" aria-label="Bench">
              {SCENARIOS.map((item) => (
                <button
                  key={item.id}
                  aria-pressed={scenario === item.id}
                  disabled={busy}
                  onClick={() => {
                    setScenario(item.id)
                    setCurrentRun(null)
                    setRunError(null)
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
                    <ReadingTip tip="Messages in this conversation.">
                      {formatReading(
                        readings[index]?.snapshot?.messageCount,
                        " messages",
                        0
                      )}
                    </ReadingTip>
                    <ReadingTip tip="Message rows currently in the DOM.">
                      {formatReading(readings[index]?.mounted, " mounted", 0)}
                    </ReadingTip>
                    <ReadingTip tip="Width of the conversation pane.">
                      {formatReading(readings[index]?.width, " px", 0)}
                    </ReadingTip>
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
              <div className="bench-result">
                {busy ? (
                  <p className="bench-measuring">Measuring…</p>
                ) : runError ? (
                  <p>{runError}</p>
                ) : currentRun && compare ? (
                  <ComparisonReadings run={currentRun} />
                ) : currentRun ? (
                  <SingleRunReadings run={currentRun} />
                ) : (
                  <p>
                    Run the bench to see layout fixed after mount, then the cost
                    of each pane.
                  </p>
                )}
              </div>
            </aside>
          </div>
          <nav className="bench-then-run" aria-label="Then run">
            <p>Then run</p>
            <ul>
              {THEN_RUN.filter((item) => item.id !== scenario).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setScenario(item.id)
                      setCurrentRun(null)
                      setRunError(null)
                      setMarked(false)
                      setOpenPicker(null)
                    }}
                  >
                    <span>{item.title}</span>
                    <span>{item.blurb}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </section>
      </div>
    </main>
  )
}
