# Chat rendering

How to render chat better than just virtualization alone. Open [http://localhost:3000](http://localhost:3000). Notes are at /docs.

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
