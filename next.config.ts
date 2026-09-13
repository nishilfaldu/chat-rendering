import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  async headers() {
    const noIndexHeaders = [
      {
        key: "X-Robots-Tag",
        value: "noindex, nofollow, noarchive",
      },
    ]

    return [
      { source: "/api/:path*", headers: noIndexHeaders },
      { source: "/embed/:path*", headers: noIndexHeaders },
      { source: "/internal/:path*", headers: noIndexHeaders },
    ]
  },
  outputFileTracingIncludes: {
    "/embed/[mode]": ["./data/bench.sqlite", "./data/bench.sqlite.gz"],
    "/api/html": ["./data/bench.sqlite", "./data/bench.sqlite.gz"],
    "/api/heights": ["./data/bench.sqlite", "./data/bench.sqlite.gz"],
    "/internal/measure": ["./data/bench.sqlite", "./data/bench.sqlite.gz"],
  },
}

export default nextConfig
