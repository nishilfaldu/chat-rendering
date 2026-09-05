import type { ReactNode } from "react"

export type ModePageParams = Promise<{
  bench?: string
  geometry?: string
  run?: string
}>

export async function loadModePage<Payload>({
  searchParams,
  load,
  render,
}: {
  searchParams: ModePageParams
  load: (state: "saved" | "cold" | "partial") => Payload
  render: (
    payload: Payload,
    request: { benchmark: boolean; simulated: boolean }
  ) => ReactNode
}) {
  const params = await searchParams
  const state =
    params.geometry === "cold" || params.geometry === "partial"
      ? params.geometry
      : "saved"
  const payload = load(state)
  return render(payload, {
    simulated: state !== "saved",
    benchmark: params.bench === "1",
  })
}
