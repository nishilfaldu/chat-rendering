import type { Metadata } from "next"
import Link from "next/link"

import styles from "./docs.module.css"

export const metadata: Metadata = {
  title: "Notes · Chat rendering",
  description:
    "Height and cost for TanStack Virtual, Browser cache (IndexedDB), Precomputed (fetched from server), and Precomputed + baked HTML.",
}

export default function DocsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/">Chat rendering</Link>
          <Link href="/">Open the bench</Link>
        </header>
        <article className={styles.article}>
          <h1>Notes</h1>

          <h2>TanStack Virtual</h2>
          <ul>
            <li>
              Height is 80 px until the row mounts. Then it is measured and
              corrected.
            </li>
            <li>Cost is that work on every visit.</li>
          </ul>

          <h2>Browser cache (IndexedDB)</h2>
          <ul>
            <li>
              Height comes from IndexedDB. This browser stores measured heights
              and reuses them on the next visit.
            </li>
            <li>
              Cost is IndexedDB reads and writes on this device, per width
              bucket. A cold cache writes during scroll.
            </li>
          </ul>

          <h2>Precomputed (fetched from server)</h2>
          <ul>
            <li>
              Height comes from measurements on the server. They ship with the
              page. The client still re-measures and POSTs corrections to{" "}
              <code>/api/heights</code>. This demo was seeded with a headless
              browser. A live app would collect those heights from visits.
            </li>
            <li>
              Cost is 1,077 KB gzipped. Heights for all 20 widths arrive with
              the page. Shipping one width and fetching the rest on resize is
              untested here.
            </li>
          </ul>

          <h2>Precomputed + baked HTML</h2>
          <ul>
            <li>
              Height comes from the same server measurements, plus prerendered
              HTML for the last 48 messages. The working set is 160 entries.
              Jump fetches HTML for that range. Placeholders keep row geometry
              until bodies arrive.
            </li>
            <li>Cost is 918 KB gzipped, plus fetch latency on Jump.</li>
          </ul>
        </article>
      </div>
    </main>
  )
}
