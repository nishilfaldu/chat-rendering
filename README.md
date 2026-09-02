# chat-surface-bench

A public-numbers bench for one claim: a **server-persisted, per-width-bucket, measured-height index** makes a 10,000-message chat surface fast and honest compared with naive, baseline, and orbit-style.

Metrics on the HUD: **first paint**, **scroll fps**, **jump-to-N**. All four modes are one Next app.

| Path | What it is |
|------|------------|
| `/naive` | All 10k rows in the DOM. Painful, but truthful heights. |
| `/baseline` | TanStack Virtual + live `measureElement`. Cold until you scroll. |
| `/orbit-style` | Fixed class-estimate row heights. Short estimates clip. |
| `/server-index` | Sqlite index of **measured** px per width bucket + prerendered HTML for the visible window. |

Every mode opens at the **bottom** (chat, not a document) and sticks there while the last message streams, unless you scroll away.

## Run

```bash
pnpm install
pnpm seed          # writes data/bench.sqlite (messages, html, measured heights)
pnpm dev           # http://localhost:3000 → /naive
```

`pnpm seed` starts the chat app if it is not already running, opens `/internal/measure?w=` at 400 / 800 / 1440, and stores `offsetHeight` into `height_measurements`. Warm on `/server-index` means that table is complete — it is not a hardcoded badge.

## Numbers

First paint starts when `BenchProvider` mounts and includes `generateMessages()` for the client-generated modes. `/server-index` does not call `generateMessages()` on the client; it reads sqlite and paints prerendered HTML.

Jump time is the scroll plus two animation frames (and, on server-index, fetching HTML for the target window).
