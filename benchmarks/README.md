# Production benchmark

The benchmark runner builds the app in production mode, starts an isolated local server, launches Chrome with a fresh browser context for every sample, performs the same scripted journey in every mode, and writes both raw observations and grouped median/p95 summaries. Modes run round-robin within each repetition to reduce temporal and thermal ordering bias. Server measurement write-back is disabled during benchmark navigation, so one sample cannot change the next sample's cache.

## Published protocol

The default matrix is deliberately expensive:

- 20 runs per cell
- 480px, 768px, and 1280px viewports at DPR 1
- one canonical 10,000-message SQLite conversation
- naive, TanStack baseline, height-class estimates, Orbit client cache, server heights, and Railgun full

Run it with:

```bash
pnpm bench
```

For a one-sample validation of all six modes:

```bash
pnpm bench:smoke
```

The runner accepts `--runs=`, `--widths=`, `--modes=`, `--height=`, and `--dpr=`. Use `--no-build` only when an unchanged production build already exists. Set `CHROME_PATH` when Chrome is not in a standard macOS, Linux, or Windows location.

## Recorded evidence

Every run records:

- navigation to visible content and geometry stability
- FCP, LCP, and CLS
- row correction count and corrected pixels
- deep-jump error and correction-induced anchor displacement
- resize anchor displacement and stream bottom error
- frame-time p50/p95/p99, long tasks, and main-thread blocking
- empty viewport samples, visible content-loading samples, and clipped frames
- mounted DOM nodes and JavaScript heap growth
- encoded initial payload bytes and server query time
- cache state and prerendered-HTML hit rate

`results/raw.json` retains every sample. `results/summary.json` and `results/summary.md` group each mode/width cell and publish medians plus p95 values. Artifacts identify the commit and dirty state, browser, OS, viewport, DPR, message count, corpus hash, renderer/cache versions, and production mode.

The runner checkpoints after each round-robin repetition. Every artifact carries an explicit complete/incomplete status and completed/expected sample counts, so interrupted output cannot be mistaken for a finished publication.

The harness is intentionally separate from the in-app workbench. Workbench readings are diagnostic; the production runner is the source of publishable numbers.

## Interactive diagnostics

The public bench runs each selected scenario inside its conversation frame. Live timing includes instrumentation and shared-browser contention. Its download is labeled diagnostic. The production harness runs surfaces separately. A frame with a mounted loading placeholder is counted as content-loading, not as an empty viewport.
