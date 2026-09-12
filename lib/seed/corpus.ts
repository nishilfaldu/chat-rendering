export const SHORTS = [
  "Did the deploy finish?",
  "Can you paste the failing test?",
  "That works on my machine now.",
  "Where is the config for the staging host?",
  "The timeout is still too low for cold starts.",
  "How many retries did it take?",
  "I'll open a PR after the tests pass.",
  "The logs only show the last twenty lines.",
  "We should pin the Node version.",
  "Does this work with an empty cache?",
] as const

export const PARAGRAPHS = [
  "The release notes mention a new retry budget for the search indexer. I tried a cold start on staging and the first query still took long enough that the client showed a spinner, then a cached result from an older build. If we ship this, we should say which cache the client is reading and how long a miss is allowed to wait.",
  "I compared the two query plans. The nested loop is fine for a few hundred rows, but the join to the events table grows with the retention window. Filtering on day first keeps the working set in memory. The covering index helps the point lookups; it does not help the report that scans a month.",
  "The webhook handler acknowledges before the side effects finish. That is fine when the queue is healthy. Last night the worker stalled, so the dashboard showed a success that never landed in billing. We should record the intent, then mark it applied only after the write, and make the replay idempotent on the provider id.",
  "The design review asked for a denser table on desktop and a stacked card on a phone. The same fields have to wrap at 320 px without clipping the status pill. I would rather drop the secondary timestamp than shrink the type. The export CSV can keep the full precision.",
  "We can keep the feature flag on for the internal tenants this week. The public rollout should wait until the backfill of the new column finishes; otherwise the empty state looks like a permissions error. I will post in the channel when the last shard is done.",
] as const

export const CODE_SAMPLES: ReadonlyArray<{ lang: string; text: string }> = [
  {
    lang: "ts",
    text: `export function parseRetryAfter(header: string | null): number {
  if (!header) return 1_000
  const seconds = Number(header)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000
  const date = Date.parse(header)
  if (Number.isNaN(date)) return 1_000
  return Math.max(0, date - Date.now())
}

export function backoff(attempt: number, baseMs = 250, capMs = 8_000): number {
  const exp = Math.min(capMs, baseMs * 2 ** attempt)
  return Math.floor(exp / 2 + Math.random() * (exp / 2))
}`,
  },
  {
    lang: "tsx",
    text: `function StatusPill({ value }: { value: "queued" | "running" | "done" }) {
  return (
    <span data-status={value} className="status-pill">
      {value}
    </span>
  )
}

export function JobRow({
  name,
  value,
  updatedAt,
}: {
  name: string
  value: "queued" | "running" | "done"
  updatedAt: string
}) {
  return (
    <tr>
      <th scope="row">{name}</th>
      <td>
        <StatusPill value={value} />
      </td>
      <td>{updatedAt}</td>
    </tr>
  )
}`,
  },
  {
    lang: "python",
    text: `def djb2(text: str) -> int:
    h = 5381
    for ch in text:
        h = ((h << 5) + h + ord(ch)) & 0xFFFFFFFF
    return h


def chunks(items: list[str], size: int) -> list[list[str]]:
    return [items[i : i + size] for i in range(0, len(items), size)]`,
  },
  {
    lang: "sql",
    text: `CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX jobs_tenant_status ON jobs(tenant_id, status);

SELECT j.id, j.status, j.updated_at
FROM jobs j
WHERE j.tenant_id = :tenant
  AND j.status IN ('queued', 'running')
ORDER BY j.created_at;`,
  },
  {
    lang: "rust",
    text: `fn clamp_window(start: u64, end: u64, max_span: u64) -> (u64, u64) {
    if end < start {
        return (start, start);
    }
    let span = end.saturating_sub(start);
    if span <= max_span {
        (start, end)
    } else {
        (end.saturating_sub(max_span), end)
    }
}`,
  },
  {
    lang: "go",
    text: `func replay(text string, emit func(string)) {
    start := 0
    for i, r := range text {
        if r == ' ' || r == '\\n' {
            emit(text[start : i+1])
            start = i + 1
        }
    }
    if start < len(text) {
        emit(text[start:])
    }
}`,
  },
  {
    lang: "bash",
    text: `set -euo pipefail
pnpm lint
pnpm typecheck
pnpm build
curl -fsS "$STAGING_URL/api/health" >/dev/null
echo "staging health ok"`,
  },
  {
    lang: "json",
    text: `{
  "job": "index-rebuild",
  "tenant": "acme",
  "attempt": 2,
  "status": "running",
  "startedAt": "2026-03-15T18:04:12Z",
  "rows": { "scanned": 18420, "written": 18311 }
}`,
  },
]

export const IMAGE_BOXES: ReadonlyArray<{ width: number; height: number }> = [
  { width: 1280, height: 720 },
  { width: 800, height: 800 },
  { width: 640, height: 360 },
  { width: 1024, height: 256 },
  { width: 512, height: 768 },
]
