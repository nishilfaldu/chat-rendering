import type { NextConfig } from "next"
import path from "node:path"
import { fileURLToPath } from "node:url"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@chat-surface-bench/seed", "@chat-surface-bench/bench"],
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."),
  outputFileTracingIncludes: {
    "*": ["../../data/bench.sqlite"],
  },
}

export default nextConfig
