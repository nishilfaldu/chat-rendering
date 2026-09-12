export const SCENARIOS = [
  {
    id: "jump",
    label: "Jump",
    description:
      "Both panes jump to message 8,000. The left pane guesses heights for unmounted rows and corrects them after landing. The right pane already has those heights. Read Layout fixed after mount first, then payload.",
  },
  {
    id: "reopen",
    label: "Reopen",
    description:
      "Second visit. The baseline guesses 80 px again. IndexedDB and the server already have heights. Time to first content includes the payload each pane ships.",
  },
  {
    id: "scroll",
    label: "Scroll",
    description:
      "Scroll the full history. The baseline re-measures rows it never stored and fixes pixels as it goes.",
  },
  {
    id: "resize",
    label: "Resize",
    description:
      "Width bucket changes. Heights stored for another width do not match. The same message may move.",
  },
  {
    id: "stream",
    label: "Stream",
    description:
      "Every pane anchors while the last response grows. Drift should stay near 0.",
  },
] as const

export type Scenario = (typeof SCENARIOS)[number]["id"]

export const THEN_RUN = [
  {
    id: "reopen" as const,
    title: "Reopen",
    blurb: "second visit, including payload",
  },
  {
    id: "scroll" as const,
    title: "Scroll",
    blurb: "full pass through history",
  },
  {
    id: "resize" as const,
    title: "Resize",
    blurb: "width bucket changes",
  },
  {
    id: "stream" as const,
    title: "Stream",
    blurb: "anchoring, not a height source",
  },
  {
    id: "jump" as const,
    title: "Jump",
    blurb: "jump to message 8,000",
  },
]
