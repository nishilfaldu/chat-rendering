import type { Metadata } from "next"
import Link from "next/link"

import styles from "./docs.module.css"

export const metadata: Metadata = {
  title: "Notes · Chat rendering",
  description:
    "Where each height comes from and what it costs. IndexedDB, the server, and prerendered HTML.",
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

          <h2>TanStack Virtual, measured after mount</h2>
          <ul>
            <li>
              Height comes from <code>estimateSize</code> returning 80, then{" "}
              <code>measureElement</code> after the row mounts. The spacer is
              corrected in place.
            </li>
            <li>
              Cost is the same work on every visit. Rows re-measure. Pixels get
              fixed after mount.
            </li>
          </ul>

          <h2>Heights this browser already measured (IndexedDB)</h2>
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

          <h2>Heights measured on the server</h2>
          <ul>
            <li>
              Height comes from measurements on the server. They ship with the
              page. The client still re-measures and POSTs corrections to{" "}
              <code>/api/heights</code>. This demo was seeded with a headless
              browser. A live app would collect those heights from visits.
            </li>
            <li>
              Cost is +819 KB gzipped versus the baseline embed. That is 200,000
              precomputed heights. Time to first content can be later than the
              baseline because heights for all 20 widths arrive with the page.
              Shipping one width and fetching the rest on resize is untested
              here.
            </li>
          </ul>

          <h2>Heights + rendered HTML from the server</h2>
          <ul>
            <li>
              Height comes from the same server measurements, plus prerendered
              HTML for the last 48 messages. The working set is 160 entries.
              Jump fetches HTML for that range. Placeholders keep row geometry
              until bodies arrive.
            </li>
            <li>
              Cost is +660 KB gzipped versus the baseline embed, plus fetch
              latency on Jump.
            </li>
          </ul>
        </article>
      </div>
    </main>
  )
}
