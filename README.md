# Chat rendering

An experiment in keeping long conversations responsive while messages stream, the window resizes, and the reader moves through history.

The public page is one workbench: pick an implementation, run an experiment, and read diagnostic timings from this browser. Downloadable production results live at `/results`.

## Run locally

```sh
pnpm install
pnpm seed
pnpm dev
```

Open http://localhost:3000. Seeding generates a deterministic 10,000-message SQLite conversation, prerenders message content, and measures heights at 32px content-width intervals. It reuses the local development server when available. Set `CHAT_URL` to use a different measurement server.

## Implementations

| Implementation                | Approach                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Every message                 | Render every message. Natural geometry with a large DOM.                                       |
| Measured in the browser       | Virtualize and measure messages in the browser.                                                |
| Estimated by content type     | Use fixed estimates by content type. An intentionally imperfect control that can clip content. |
| Saved in this browser         | Reuse heights and rendered content saved in this browser.                                      |
| Saved measurements            | Load saved measurements; render Markdown in the browser.                                       |
| Saved measurements + HTML     | Load saved measurements and fetch prerendered HTML in bounded windows.                         |

The workbench loads each implementation in a conversation frame. Server-backed modes accept `?geometry=cold` or `?geometry=partial` to omit all or half the saved measurements without modifying the database. Browser-cache mode exposes a reset command to benchmark scripts.

All modes open at the bottom. Streaming follows the end until the reader moves into history. The public comparison uses equal-width surfaces and runs the same selected scenario in each; manual scrolling is independent.

## Verify behavior

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm verify
CHECK_URL=http://localhost:3000 pnpm test:behavior
CHECK_URL=http://localhost:3000 pnpm test:ui
CHECK_URL=http://localhost:3000 pnpm test:resize
```

The browser checks require Chrome. Set `CHROME_PATH` if necessary. They exercise rapid scrolling, streaming while reading history, the workbench controls, and responsive layout.

## Reproduce measurements

```sh
pnpm bench
```

The default production protocol runs each implementation 20 times at 480px, 768px, and 1280px. It records raw observations, median/p95 summaries, browser and corpus versions, cache conditions, and Git revision/dirty state in `benchmarks/results/`.

For a shorter check: `pnpm bench:smoke`. Limited runs are explicitly labeled exploratory in the results page. They are not evidence for reliable tail-latency claims.

The production suite includes navigation, database work, transfer, parsing, hydration, and rendering. It does not isolate geometry costs. In-page readings include diagnostic overhead; simultaneous comparisons share browser resources.

The corpus contains text, Markdown, code, and fixed-size image placeholders. It replays text locally and does not call a model API. See [the experimental contract](docs/benchmark-contract.md) and [benchmark methodology](benchmarks/README.md).
