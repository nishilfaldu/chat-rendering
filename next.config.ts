import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: {
    "*": ["./data/bench.sqlite", "./benchmarks/results/*.json"],
  },
}

export default nextConfig
