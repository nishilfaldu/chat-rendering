import { IMPLEMENTATIONS } from "@/lib/chat-implementations"

import { formatReading, type RunResult } from "./iframe-probe"
import type { CurrentRun } from "./run-experiment"
import type { Scenario } from "./scenarios"

type ReadingField = {
  label: string
  value: (result: RunResult) => string
  visible?: boolean
}

export function experimentReadingFields(
  scenario: Scenario,
  results: RunResult[]
): ReadingField[] {
  const fields: ReadingField[] = [
    {
      label:
        scenario === "reopen"
          ? "Reopen time"
          : scenario === "jump" || scenario === "latest"
            ? "Arrival time"
            : "Duration",
      value: (result) => formatReading(result.elapsed, " ms", 0),
    },
    {
      label: "Mounted elements at finish",
      value: (result) => formatReading(result.mounted, "", 0),
    },
    {
      label: "Height corrections",
      value: (result) => formatReading(result.corrections, "", 0),
    },
    {
      label: "Total corrected",
      value: (result) => formatReading(result.correctedPx, " px", 0),
    },
    {
      label: "Frame interval p95",
      value: (result) => formatReading(result.frameP95, " ms"),
      visible: results.some((result) => result.frameP95 !== null),
    },
    {
      label: "Empty viewport samples",
      value: (result) =>
        result.frames ? `${result.blank} / ${result.frames}` : "—",
      visible: results.some((result) => result.frames > 0),
    },
    {
      label: "Content loading samples",
      value: (result) =>
        result.frames ? `${result.pending} / ${result.frames}` : "—",
      visible: results.some((result) => result.frames > 0),
    },
    {
      label: "Reading position moved",
      value: (result) => formatReading(result.drift, " px"),
      visible: results.some((result) => result.drift !== null),
    },
    {
      label: "Landing error",
      value: (result) => formatReading(result.landing, " px"),
      visible: results.some((result) => result.landing !== null),
    },
  ]
  return fields.filter((field) => field.visible !== false)
}

export function ComparisonReadings({ run }: { run: CurrentRun }) {
  const fields = experimentReadingFields(run.scenario, run.results)
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
              <td key={index}>{field.value(result)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function SingleRunReadings({ run }: { run: CurrentRun }) {
  const fields = experimentReadingFields(run.scenario, run.results)
  return (
    <>
      {run.results.map((result, index) => (
        <div key={index}>
          <dl>
            {fields.map((field, fieldIndex) => (
              <div
                key={field.label}
                className={fieldIndex === 0 ? "bench-primary-reading" : undefined}
              >
                <dt>{field.label}</dt>
                <dd>
                  {fieldIndex === 0 ? (
                    <>
                      {formatReading(result.elapsed, "", 0)} <span>ms</span>
                    </>
                  ) : (
                    field.value(result)
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </>
  )
}
