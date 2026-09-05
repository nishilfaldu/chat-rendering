import { existsSync } from "node:fs"
import path from "node:path"

export function workspaceRoot(start = process.cwd()): string {
  let directory = start
  while (true) {
    if (existsSync(path.join(directory, "next.config.ts"))) {
      return directory
    }
    const parent = path.dirname(directory)
    if (parent === directory) {
      throw new Error("could not find next.config.ts")
    }
    directory = parent
  }
}
