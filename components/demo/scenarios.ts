export const SCENARIOS = [
  {
    id: "jump",
    label: "Jump",
    description: "Jump to message 8,000",
  },
  {
    id: "reopen",
    label: "Reopen",
    description: "Open the conversation again",
  },
  {
    id: "scroll",
    label: "Scroll",
    description: "Scroll the full history",
  },
  {
    id: "resize",
    label: "Resize",
    description: "Device width changes",
  },
  {
    id: "stream",
    label: "Stream",
    description: "The last reply grows",
  },
] as const

export type Scenario = (typeof SCENARIOS)[number]["id"]
