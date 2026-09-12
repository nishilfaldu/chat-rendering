# Chat rendering

A costed bench of ways to give TanStack Virtual row heights before rows mount: this browser's cache, server measurements, and prerendered HTML. Compare them at [http://localhost:3000](http://localhost:3000); the notes are at /docs.

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000. The seeded conversation unpacks from `data/bench.sqlite.gz` on first run.

To rebuild that corpus after changing messages or layout: `pnpm seed && pnpm pack:sqlite`.

```sh
pnpm lint
pnpm typecheck
pnpm verify
```
