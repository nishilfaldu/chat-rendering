import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: {
    "*": ["./data/bench.sqlite"],
  },
}

export default nextConfig
