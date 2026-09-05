# Chat rendering benchmark contract

## Thesis

This project is a benchmark and reference implementation for fast, correct, memory-efficient AI chat surfaces with long, variable-height histories.

Virtualized chat surfaces usually place unseen messages using estimated heights, then correct those positions after the DOM renders. Expensive and asynchronous content such as Markdown, highlighted code, images, and tool output makes those corrections visible as jumps, blank space, overlap, or scroll pushback. The experiment tests whether settled message heights, persisted by effective content-width bucket and delivered by the server, can make the initial geometry correct while keeping the DOM and content cache bounded.

The server height index is a hint that should normally be exact, not an unquestionable source of truth. A mounted row must be allowed to report a different real height, and only a settled real height may be persisted again.

## User journeys

Every implementation must support the same journeys over the same canonical SQLite corpus:

1. Open an existing 10,000-message conversation at the bottom.
2. Scroll rapidly through history without blank frames or scroll pushback.
3. Jump directly to message 8,000 and land on the requested row.
4. Stream the final response while following only when the reader is pinned to the end.
5. Resize the chat without losing the visible reading position.
6. Reopen the conversation with an empty, partial, or complete measurement cache.
7. Keep mounted DOM and retained rendered content bounded in virtualized modes.

## Comparison modes

| Implementation                | Data source | Geometry                                               | Rendered-content cache         |
| ----------------------------- | ----------- | ------------------------------------------------------ | ------------------------------ |
| Every message                 | SQLite      | Natural DOM for all rows                               | None                           |
| Measured in the browser       | SQLite      | Flat estimate, then live measurement                   | In-memory only                 |
| Estimated by content type     | SQLite      | Fixed content-class estimate                           | None                           |
| Saved in this browser         | SQLite      | Settled measurements persisted in IndexedDB            | Settled HTML in IndexedDB      |
| Saved measurements            | SQLite      | Settled server measurements with a live DOM truth path | None                           |
| Saved measurements + HTML     | SQLite      | Settled server measurements with a live DOM truth path | Server-prerendered, paged HTML |

The height-only and HTML-backed saved-measurement implementations are separate so the effect of correct initial geometry is not confused with the effect of bypassing client Markdown and syntax-highlight rendering.

## Cache states

- **Cold:** no valid measurements exist for the current dataset, content, renderer, layout, and width bucket.
- **Partial:** at least one but not all required rows have valid measurements.
- **Warm:** every row required by the benchmark corpus has a settled, version-valid measurement at every benchmark width.

A row measurement is valid only when its message content hash, dataset version, renderer version, layout version, and effective content-width bucket match the current render.

The shared message column snaps to the selected 32px effective width in CSS. A bucket therefore describes the real text-wrapping width, not a nearby estimate, while the surrounding chat surface can remain fluid.

## Correctness properties

- No clipped or overlapping completed messages.
- Cached geometry is used before a row's first client measurement.
- A real ResizeObserver measurement may correct any cached value.
- Only measurements that remain unchanged for the settle window are persisted.
- Valid cache hits produce no post-mount size correction.
- Deep jumps land on the requested row and remain there after visible content settles.
- End-pinned streaming follows growth; scrolling away releases the pin.
- Width changes preserve either the reading anchor or the end pin.
- Missing or invalid measurements fall back to estimates without preventing later correction.
- Virtualized modes retain only a bounded visible window and bounded rendered-content cache.

## Measurement boundary

The experiment distinguishes two suites:

1. **Rendering-controlled:** identical data is already available before timing begins, isolating geometry and rendering strategy.
2. **End-to-end:** navigation, database work, transfer, parsing, hydration, rendering, and paged content are included.

The automated runner currently publishes the end-to-end suite, which is the user-facing comparison. A rendering-controlled suite must be added before making claims that isolate geometry from transfer, database, parsing, or hydration costs. In-app workbench readings are diagnostic only and must not be presented as publication-quality evidence.

## Explicit non-goals

Authentication, model APIs, a production composer, conversation management, and unrelated visual polish are outside the benchmark. The project evaluates the long-history chat surface, not a complete chat product.
