import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: {
    "/embed/[mode]": ["./data/bench.sqlite", "./data/bench.sqlite.gz"],
    "/api/html": ["./data/bench.sqlite", "./data/bench.sqlite.gz"],
    "/api/heights": ["./data/bench.sqlite", "./data/bench.sqlite.gz"],
    "/internal/measure": ["./data/bench.sqlite", "./data/bench.sqlite.gz"],
  },
}

export default nextConfig
