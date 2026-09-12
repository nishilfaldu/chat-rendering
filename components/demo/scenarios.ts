export const SCENARIOS = [
  {
    id: "jump",
    label: "Jump",
    description:
      "Both panes jump to message 8,000. The left pane has to discover the heights of rows it never mounted and fix them after landing. The right pane already has them. Read “Layout fixed after mount” first, then the cost line.",
  },
  {
    id: "reopen",
    label: "Reopen",
    description:
      "Second visit. The baseline starts from scratch; the browser cache and the server already know these heights. Time to first content includes the payload each one ships.",
  },
  {
    id: "scroll",
    label: "Scroll",
    description:
      "A full pass through history. Height ignorance shows up as rows re-measured and pixels fixed as the baseline discovers sizes it never stored.",
  },
  {
    id: "resize",
    label: "Resize",
    description:
      "The width bucket changes. Heights from another width are the wrong shape; watch whether each pane restores the same message and what it has to re-learn.",
  },
  {
    id: "stream",
    label: "Stream",
    description:
      "Nothing here is a strategy; every pane anchors. Drift should stay near zero while the last response grows.",
  },
] as const

export type Scenario = (typeof SCENARIOS)[number]["id"]

export const THEN_RUN = [
  {
    id: "reopen" as const,
    title: "Reopen",
    blurb: "who pays on the second visit",
  },
  {
    id: "scroll" as const,
    title: "Scroll",
    blurb: "a full pass through history",
  },
  {
    id: "resize" as const,
    title: "Resize",
    blurb: "the width bucket changes",
  },
  {
    id: "stream" as const,
    title: "Stream",
    blurb: "nothing here is a strategy; every pane anchors",
  },
  {
    id: "jump" as const,
    title: "Jump",
    blurb: "unmounted history, then count the fix",
  },
]
