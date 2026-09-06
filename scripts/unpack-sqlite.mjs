import { createReadStream, createWriteStream, existsSync } from "node:fs"
import path from "node:path"
import { pipeline } from "node:stream/promises"
import { createGunzip } from "node:zlib"
import { fileURLToPath } from "node:url"

const required = process.argv.includes("--required")
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const file = path.join(root, "data", "bench.sqlite")
const archive = `${file}.gz`

if (existsSync(file)) process.exit(0)
if (!existsSync(archive)) {
  if (required) {
    console.error(`missing ${archive}; run pnpm seed && pnpm pack:sqlite`)
    process.exit(1)
  }
  process.exit(0)
}

await pipeline(createReadStream(archive), createGunzip(), createWriteStream(file))
