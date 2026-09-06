# Chat rendering

Six ways to keep a long conversation responsive. Compare them in the workbench, then open `/docs` in the app for the tradeoffs.

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
