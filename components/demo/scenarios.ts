export const SCENARIOS = [
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

export type Scenario = (typeof SCENARIOS)[number]["id"]
