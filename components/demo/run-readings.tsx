"use client"

import { useState } from "react"
import { IMPLEMENTATIONS } from "@/lib/chat-implementations"

import { formatReading, type RunResult } from "./iframe-probe"
import { ReadingTip } from "./reading-tip"
import type { CurrentRun } from "./run-experiment"
import type { Scenario } from "./scenarios"

type ReadingField = {
  label: string
  tip: string
  value: (result: RunResult) => number | null
  unit: string
  digits?: number
}
const frameInterval: ReadingField = {
  label: "Frame interval p95",
  tip: "95% of measured gaps between animation frames were this short or shorter. Larger gaps can feel like stutter. These are browser callback intervals, not isolated rendering costs.",
  value: (result) => result.frameP95,
  unit: "ms",
}
const longestFrame: ReadingField = {
  label: "Longest frame gap",
  tip: "The largest measured gap between animation frames during this run. This can reveal a brief pause that p95 misses. Smaller is better.",
  value: (result) => result.longestFrame,
  unit: "ms",
}
const corrections: ReadingField[] = [
  {
    label: "Height corrections",
    tip: "Recorded adjustments when a measured message height differs from its estimate or saved height. Anchoring can keep content still even when corrections occur.",
    value: (result) => result.corrections,
    unit: "",
    digits: 0,
  },
  {
    label: "Total corrected",
    tip: "Sum of the absolute height adjustments during this run, in pixels. This is internal layout work, not the distance your reading position moved.",
    value: (result) => result.correctedPx,
    unit: "px",
  },
]

export function experimentReadingFields(scenario: Scenario): ReadingField[] {
  switch (scenario) {
    case "reopen":
      return [
        {
          label: "Time to appear",
          tip: "Time from reopening until a fresh surface has visible message content across two animation-frame checks. Includes loading and mounting; an approximation of when content appears. Lower is faster.",
          value: (result) => result.elapsed,
          unit: "ms",
          digits: 0,
        },
        {
          label: "Mounted messages",
          tip: "Message rows present in the conversation DOM at the end of this run, including rows just outside the viewport.",
          value: (result) => result.mounted,
          unit: "",
          digits: 0,
        },
      ]
    case "jump":
    case "latest":
      return [
        {
          label: "Jump time",
          tip: "Time to complete the jump, including content fetching where needed, alignment attempts, and two animation frames afterward. Lower is faster; this is not a first-pixel measurement.",
          value: (result) => result.elapsed,
          unit: "ms",
          digits: 0,
        },
        {
          label: "Position drift",
          tip: "Largest sampled movement of the target during the 400 ms after the jump finishes. Zero means it stayed put during that window.",
          value: (result) => result.drift,
          unit: "px",
        },
        {
          label: "Landing offset",
          tip: "Final distance from the intended viewport edge: the top for Jump, the bottom for Latest. Zero means the target landed exactly.",
          value: (result) => result.landing,
          unit: "px",
        },
      ]
    case "scroll":
      return [frameInterval, longestFrame]
    case "stream":
      return [
        frameInterval,
        longestFrame,
        {
          label: "Reading-position drift",
          tip: "Largest sampled movement of the same message while you pause in the history during streaming. Your scrolling and following the latest response are excluded. A dash means no stationary position was measured, or the tracked message disappeared.",
          value: (result) => result.drift,
          unit: "px",
        },
      ]
    case "resize":
      return [
        {
          label: "Position shift after resize",
          tip: "Distance the original top-visible message moved after the 900 ms resize observation. Zero means it ended where it started. A dash means the message could not be tracked or you scrolled during the run.",
          value: (result) => result.drift,
          unit: "px",
        },
        {
          label: "Maximum sampled movement",
          tip: "Largest sampled movement of that message during the resize, including movement that later corrected itself. Zero means no movement was observed. A dash means tracking was interrupted.",
          value: (result) => result.peakDrift,
          unit: "px",
        },
      ]
  }
}
function value(field: ReadingField, result: RunResult) {
  return formatReading(
    field.value(result),
    field.unit ? ` ${field.unit}` : "",
    field.digits ?? 1
  )
}
function FrameReference({ scenario }: { scenario: Scenario }) {
  return scenario === "scroll" || scenario === "stream" ? (
    <p className="bench-frame-reference">
      One frame: ~16.7 ms at 60 Hz · ~8.3 ms at 120 Hz.
    </p>
  ) : null
}
function ReadingTable({
  run,
  fields,
  label,
}: {
  run: CurrentRun
  fields: ReadingField[]
  label: string
}) {
  return (
    <table className="bench-comparison-readings" aria-label={label}>
      <thead>
        <tr>
          <td />
          {run.results.map((result, index) => (
            <th scope="col" key={index}>
              {IMPLEMENTATIONS[result.mode].label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {fields.map((field) => (
          <tr key={field.label}>
            <th scope="row">
              <ReadingTip tip={field.tip}>{field.label}</ReadingTip>
            </th>
            {run.results.map((result, index) => (
              <td key={index}>{value(field, result)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
function RenderingDetails({
  run,
  compare = false,
}: {
  run: CurrentRun
  compare?: boolean
}) {
  const [open, setOpen] = useState(true)
  return (
    <details
      className="bench-rendering-details"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Rendering details</summary>
      {compare ? (
        <ReadingTable
          run={run}
          fields={corrections}
          label="Rendering details comparison"
        />
      ) : (
        run.results.map((result, index) => (
          <dl key={index}>
            {corrections.map((field) => (
              <div key={field.label}>
                <dt>
                  <ReadingTip tip={field.tip}>{field.label}</ReadingTip>
                </dt>
                <dd>{value(field, result)}</dd>
              </div>
            ))}
          </dl>
        ))
      )}
    </details>
  )
}
export function ComparisonReadings({ run }: { run: CurrentRun }) {
  return (
    <>
      <ReadingTable
        run={run}
        fields={experimentReadingFields(run.scenario)}
        label="Experiment comparison"
      />
      <FrameReference scenario={run.scenario} />
      <RenderingDetails run={run} compare />
    </>
  )
}
export function SingleRunReadings({ run }: { run: CurrentRun }) {
  const fields = experimentReadingFields(run.scenario)
  return (
    <>
      {run.results.map((result, index) => (
        <dl key={index}>
          {fields.map((field, fieldIndex) => (
            <div
              key={field.label}
              className={fieldIndex === 0 ? "bench-primary-reading" : undefined}
            >
              <dt>
                <ReadingTip tip={field.tip}>{field.label}</ReadingTip>
              </dt>
              <dd>
                {fieldIndex === 0 ? (
                  <>
                    {formatReading(field.value(result), "", field.digits ?? 1)}
                    {field.value(result) !== null && field.unit ? (
                      <span> {field.unit}</span>
                    ) : null}
                  </>
                ) : (
                  value(field, result)
                )}
              </dd>
            </div>
          ))}
        </dl>
      ))}
      <FrameReference scenario={run.scenario} />
      {run.scenario === "stream" &&
      run.results.some((result) => result.drift === null) ? (
        <p>
          Scroll away and pause during streaming to measure reading-position
          drift.
        </p>
      ) : null}
      <RenderingDetails run={run} />
    </>
  )
}
