"use client"

import { IMPLEMENTATIONS } from "@/lib/chat-implementations"
import { PRODUCTION_EMBED_GZ_KB } from "@/lib/payload-costs"

import { formatReading, type RunResult } from "./iframe-probe"
import type { CurrentRun } from "./run-experiment"
import type { Scenario } from "./scenarios"

type ReadingField = {
  label: string
  value: (result: RunResult) => number | null
  unit: string
  digits?: number
}

const layoutFixed: ReadingField = {
  label: "Layout fixed after mount",
  value: (result) => result.correctedPx,
  unit: "px",
}

const rowsRemeasured: ReadingField = {
  label: "Rows re-measured",
  value: (result) => result.corrections,
  unit: "",
  digits: 0,
}

const frameInterval: ReadingField = {
  label: "Frame interval p95",
  value: (result) => result.frameP95,
  unit: "ms",
}

const longestFrame: ReadingField = {
  label: "Longest frame gap",
  value: (result) => result.longestFrame,
  unit: "ms",
}

function scenarioReadingFields(scenario: Scenario): ReadingField[] {
  switch (scenario) {
    case "reopen":
      return [
        {
          label: "Time to appear",
          value: (result) => result.elapsed,
          unit: "ms",
          digits: 0,
        },
        {
          label: "Mounted messages",
          value: (result) => result.mounted,
          unit: "",
          digits: 0,
        },
      ]
    case "jump":
      return [
        {
          label: "Jump time",
          value: (result) => result.elapsed,
          unit: "ms",
          digits: 0,
        },
        {
          label: "Position drift",
          value: (result) => result.drift,
          unit: "px",
        },
        {
          label: "Landing offset",
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
          value: (result) => result.drift,
          unit: "px",
        },
      ]
    case "resize":
      return [
        {
          label: "Position shift after resize",
          value: (result) => result.drift,
          unit: "px",
        },
        {
          label: "Maximum sampled movement",
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

const payload: ReadingField = {
  label: "Payload, gzipped KB",
  value: (result) => PRODUCTION_EMBED_GZ_KB[result.mode],
  unit: "",
  digits: 0,
}

function headlineFields(scenario: Scenario): ReadingField[] {
  return [
    layoutFixed,
    rowsRemeasured,
    ...scenarioReadingFields(scenario),
    payload,
  ]
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
            <th scope="row">{field.label}</th>
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
      <ReadingTable
        run={run}
        fields={headlineFields(run.scenario)}
        label="Bench comparison"
      />
      <FrameReference scenario={run.scenario} />
    </>
  )
}

export function SingleRunReadings({ run }: { run: CurrentRun }) {
  return (
    <>
      <ReadingTable
        run={run}
        fields={headlineFields(run.scenario)}
        label="Bench readings"
      />
      <FrameReference scenario={run.scenario} />
      {run.scenario === "stream" &&
      run.results.some((result) => result.drift === null) ? (
        <p>
          Scroll away and pause during streaming to measure reading-position
          drift.
        </p>
      ) : null}
    </>
  )
}
