"use client"

import { IMPLEMENTATIONS, implementationCost } from "@/lib/chat-implementations"
import { extraPayloadKbGz } from "@/lib/payload-costs"
import { WIDTH_BUCKETS } from "@/lib/seed/types"

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

const layoutFixed: ReadingField = {
  label: "Layout fixed after mount",
  tip: "Sum of absolute height adjustments after rows mounted, in pixels. Separate from how far the reading position moved.",
  value: (result) => result.correctedPx,
  unit: "px",
}

const rowsRemeasured: ReadingField = {
  label: "Rows re-measured",
  tip: "Count of those adjustments when a measured height differs from the estimate or saved height.",
  value: (result) => result.corrections,
  unit: "",
  digits: 0,
}

const frameInterval: ReadingField = {
  label: "Frame interval p95",
  tip: "95th percentile gap between animation frames. These are requestAnimationFrame intervals.",
  value: (result) => result.frameP95,
  unit: "ms",
}

const longestFrame: ReadingField = {
  label: "Longest frame gap",
  tip: "Largest requestAnimationFrame gap in this run. p95 can hide one long gap.",
  value: (result) => result.longestFrame,
  unit: "ms",
}

function scenarioReadingFields(scenario: Scenario): ReadingField[] {
  switch (scenario) {
    case "reopen":
      return [
        {
          label: "Time to appear",
          tip: "Time from reopen until message content is visible across two frames. Includes load and mount.",
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
      return [
        {
          label: "Jump time",
          tip: "Time to finish the jump, including fetches, alignment, and two frames after. Not first paint.",
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
          tip: "Distance from the intended top edge after Jump. Zero means the target landed on that edge.",
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
          tip: "Largest sampled movement of the same message while paused in history during streaming. Scroll and follow-latest are excluded. A dash means no stationary position was measured.",
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
    default: {
      const _exhaustive: never = scenario
      return _exhaustive
    }
  }
}

function headlineFields(scenario: Scenario): ReadingField[] {
  return [layoutFixed, rowsRemeasured, ...scenarioReadingFields(scenario)]
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

function CostLines({ run }: { run: CurrentRun }) {
  return (
    <ul className="bench-cost-lines">
      {run.results.map((result, index) => (
        <li key={`${result.mode}-${index}`}>
          <span className="bench-cost-pane">
            {IMPLEMENTATIONS[result.mode].label}.
          </span>{" "}
          {implementationCost(result.mode, extraPayloadKbGz(result.mode))}
        </li>
      ))}
    </ul>
  )
}

function pxOf(result: RunResult | undefined) {
  return formatReading(result?.correctedPx ?? 0, "", 1)
}

function rowsOf(result: RunResult | undefined) {
  return formatReading(result?.corrections ?? 0, "", 0)
}

export function runInterpretation(run: CurrentRun): string {
  const left = run.results[0]
  const right = run.results[1]
  if (!left) return ""

  if (run.scenario === "jump" && right) {
    const bill =
      right.mode === "saved-measurements" || right.mode === "saved-html"
        ? `It shipped heights for ${WIDTH_BUCKETS.length} widths with the page.`
        : implementationCost(right.mode, extraPayloadKbGz(right.mode)).replace(
            /^Cost: /,
            ""
          )
    return `Left pane fixed ${pxOf(left)} px across ${rowsOf(left)} rows after landing. Next visit it will do that again. Right pane fixed ${pxOf(right)} px. ${bill}`
  }

  if (run.scenario === "reopen" && right) {
    const leftMs = left.elapsed == null ? "-" : `${Math.round(left.elapsed)} ms`
    const rightMs =
      right.elapsed == null ? "-" : `${Math.round(right.elapsed)} ms`
    return `Left pane appeared in ${leftMs}. Right pane appeared in ${rightMs}. Server heights can appear later because heights for all ${WIDTH_BUCKETS.length} widths arrive with the page.`
  }

  if (run.scenario === "scroll") {
    const idb = run.results.some((result) => result.mode === "saved-in-browser")
    const cold = idb
      ? " On a cold IndexedDB cache, writes run during the scroll."
      : ""
    if (right) {
      return `Left pane fixed ${pxOf(left)} px across ${rowsOf(left)} rows. Right pane fixed ${pxOf(right)} px across ${rowsOf(right)} rows.${cold}`
    }
    return `This pane fixed ${pxOf(left)} px across ${rowsOf(left)} rows after mount.${cold}`
  }

  if (right) {
    return `Left pane fixed ${pxOf(left)} px across ${rowsOf(left)} rows after mount. Right pane fixed ${pxOf(right)} px across ${rowsOf(right)} rows.`
  }
  return `This pane fixed ${pxOf(left)} px across ${rowsOf(left)} rows after mount.`
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

export function ComparisonReadings({ run }: { run: CurrentRun }) {
  return (
    <>
      <p className="bench-interpretation">{runInterpretation(run)}</p>
      <ReadingTable
        run={run}
        fields={headlineFields(run.scenario)}
        label="Bench comparison"
      />
      <FrameReference scenario={run.scenario} />
      <CostLines run={run} />
    </>
  )
}

export function SingleRunReadings({ run }: { run: CurrentRun }) {
  const fields = headlineFields(run.scenario)
  return (
    <>
      <p className="bench-interpretation">{runInterpretation(run)}</p>
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
      <CostLines run={run} />
    </>
  )
}
