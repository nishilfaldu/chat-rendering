import { createReadStream, createWriteStream, existsSync } from "node:fs"
import { spawnSync } from "node:child_process"
import path from "node:path"
import { pipeline } from "node:stream/promises"
import { createGzip } from "node:zlib"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const file = path.join(root, "data", "bench.sqlite")
const archive = `${file}.gz`

if (!existsSync(file)) {
  console.error(`missing ${file}; run pnpm seed`)
  process.exit(1)
}

const vacuum = spawnSync("sqlite3", [file, "PRAGMA journal_mode=DELETE; VACUUM;"], {
  encoding: "utf8",
})
if (vacuum.status !== 0) {
  console.error(vacuum.stderr || "sqlite3 vacuum failed")
  process.exit(vacuum.status ?? 1)
}

await pipeline(
  createReadStream(file),
  createGzip({ level: 9 }),
  createWriteStream(archive)
)
console.log(`wrote ${archive}`)
