import type { Metadata } from "next"
import Link from "next/link"
import styles from "./docs.module.css"

export const metadata: Metadata = {
  title: "Notes · Chat rendering",
  description:
    "Where TanStack Virtual gets its row heights: the baseline you already have, three earlier sources, and what each costs.",
}

const chapters = [
  ["what", "What this is"],
  ["baseline", "The baseline you already have"],
  ["browser-cache", "Heights this browser measured before"],
  ["saved-measurements", "Heights measured on the server"],
  ["saved-html", "Heights + rendered HTML from the server"],
  ["shared", "What every pane shares"],
  ["controls", "Controls"],
  ["reading", "Reading the numbers"],
  ["choosing", "Choosing"],
] as const

export default function DocsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/">Chat rendering</Link>
          <Link href="/">
            Open the bench <span aria-hidden="true" />
          </Link>
        </header>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <nav aria-label="On this page">
              <p>Notes</p>
              <ol>
                {chapters.map(([id, title]) => (
                  <li key={id}>
                    <a href={`#${id}`}>{title}</a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
          <article className={styles.article}>
            <header className={styles.intro} id="what">
              <h1>Notes</h1>
              <p>
                TanStack Virtual can&apos;t know the height of a row it
                hasn&apos;t rendered, so it guesses, mounts, measures, and
                corrects — on every visit, for every reader. This bench keeps
                the library and moves that knowledge earlier: into this
                browser&apos;s past, onto the server, or into prerendered HTML.
                Then it prices each move.
              </p>
              <p>
                Not a new virtualizer. Every pane runs{" "}
                <code>useVirtualizer</code> (one control turns it off); only{" "}
                <code>estimateSize</code> and <code>measureElement</code>{" "}
                change. What differs is where the height comes from before the
                row mounts, and what that source costs: bytes on the wire,
                storage writes, server precompute, and the risk of a stale
                height. There is no free option, which is the point.
              </p>
              <p>
                The corpus is 10,000 messages (6,009 short, 1,790 paragraph,
                1,498 code, 703 image), 20 width buckets from 320 to 928 px in
                32 px steps, and 200,000 precomputed heights. Try the panes on
                the <Link href="/">bench</Link>; the numbers there are from your
                machine.
              </p>
            </header>

            <section id="baseline">
              <h2>The baseline you already have</h2>
              <p>
                The left-hand default is TanStack Virtual with{" "}
                <code>estimateSize: () =&gt; 80</code> and{" "}
                <code>measureElement</code>. Unknown rows get an 80 px guess.
                Once a row mounts, the library measures it and corrects the
                spacer in place, then anchors so the line you are reading does
                not jump. That work happens on every visit, for every reader.
              </p>
              <p>
                The cost is not a new primitive. It is rows re-measured and
                pixels fixed after mount, paid again the next time the same
                history opens. For the mechanics of the window, overscan, and
                the spacer, see the{" "}
                <a href="https://tanstack.com/virtual/latest">
                  TanStack Virtual docs
                </a>
                . This bench leaves that wrapper alone:{" "}
                <code>components/modes/use-virtual-chat.ts</code> is shared by
                every virtualized pane.
              </p>
            </section>

            <section id="browser-cache">
              <h2>Heights this browser measured before</h2>
              <p>
                After a row has been seen, this pane stores the measured height
                and the rendered HTML in IndexedDB. The key is session, message,
                width bucket, and content hash. A row has to sit still for about
                500 ms before it is persisted; a streaming row, or one that
                unmounts first, may not be saved.{" "}
                <code>CACHE_REVISION</code> drops the derived stores when fonts
                or layout change.
              </p>
              <p>
                Two catches. Width still matters: a paragraph that was 80 px at
                800 px wide is a different row at 320 px, so each bucket is a
                separate cache entry. And the cache is device-local. Another
                browser, a cleared origin, or a width this device has never
                opened starts from the 80 px guess again.
              </p>
              <p>
                The measured cost to own: on a cold cache the write path
                competes with scrolling. A full pass through history can
                re-measure hundreds of rows while IndexedDB is still filling.
                That shows up as frame-interval cost on Scroll, not as a
                mysterious failure of the strategy.
              </p>
            </section>

            <section id="saved-measurements">
              <h2>Heights measured on the server</h2>
              <p>
                The server pane ships per-bucket offset tables with the page.
                Binary search finds the row at a scroll offset; resize restore
                reads the saved offsets for the new width. The client still
                re-measures mounted rows and POSTs corrections to{" "}
                <code>/api/heights</code>.
              </p>
              <p>
                All 20 tables ship with the page, so time to first content can
                be later than the baseline. That is the cost this bench records
                on Reopen rather than a reason to hide the pane. An untested
                variant is to ship one bucket and fetch the rest on resize.
              </p>
              <p>
                The demo seeded these tables with a headless browser so you can
                try a warm server on the first visit. A real app would collect
                the same store from visits: render, measure, send back missing
                or corrected heights, and serve them with later requests. The
                headless pass is setup, not the product.
              </p>
            </section>

            <section id="saved-html">
              <h2>Heights + rendered HTML from the server</h2>
              <p>
                Heights place a row. Bodies still have to arrive. This pane
                includes HTML for the last 48 messages with the page, then
                fetches around the visible range or a jump target into a
                160-entry working set. Placeholders hold the geometry while
                bodies are in flight, so a fast scroll can sit on the right
                offset before the Markdown is there.
              </p>
              <p>
                The cost is fetch latency, and Jump is where it shows. Landing
                can look as stable as the heights-only pane while the body is
                still a placeholder. Watch whether the message you asked for is
                actually painted, not only whether the offset was right.
              </p>
            </section>

            <section id="shared">
              <h2>What every pane shares</h2>
              <p>
                Anchoring during streaming and restore-on-resize are shared
                infrastructure, not strategies. When a row above you grows, the
                pane adjusts <code>scrollTop</code> by the same delta so the
                line you are reading stays put. On resize, it remembers a
                visible message and puts that message back after the width
                bucket changes, unless you scroll yourself.
              </p>
              <p>
                That is why drift reads 0 px in every virtualized pane that is
                doing its job. Drift is not the thing that separates height
                sources. Layout fixed after mount is.
              </p>
            </section>

            <section id="controls">
              <h2>Controls</h2>
              <p>
                <strong>No virtualization</strong> mounts all 10,000 messages.
                It is the upper bound on DOM and the lower bound on jump time,
                because message 8,000 already exists as an element. It is not a
                height source. It is here so a cheap jump is not mistaken for a
                better estimate.
              </p>
              <p>
                <strong>Content-type guess, never corrected</strong> assigns a
                fixed height from the message kind and hides overflow. The
                streaming row may grow; completed rows may clip. It is the
                clipping control that shows a zero-correction reading can lie:
                nothing was re-measured because nothing was allowed to be
                wrong, including the part of the paragraph you cannot see.
              </p>
            </section>

            <section id="reading">
              <h2>Reading the numbers</h2>
              <p>
                <strong>Layout fixed after mount</strong> is the sum of absolute
                height corrections, in pixels, after rows mounted. It is
                internal layout work. It is not how far your reading position
                moved, and it is not proof that the user saw a jump.{" "}
                <strong>Rows re-measured</strong> is the count of those
                corrections.
              </p>
              <p>
                Time, drift, and landing come next and depend on the scenario:
                jump time and landing offset, time to appear on reopen,
                frame-interval p95 on scroll and stream, position shift after
                resize. Each run is per machine and per visit. A second Reopen
                on a warm IndexedDB cache is a different bill than the first.
              </p>
              <p>
                Payload sizes in the cost line come from gzipped production
                embed HTML: the baseline pane is 258 KB; server heights add 819
                KB for the 20 width tables (1,077 KB total, about 4.2× the
                baseline); heights plus HTML add 660 KB. Your run still supplies
                layout-fixed, time, and drift. Those move with the machine.
              </p>
            </section>

            <section id="choosing">
              <h2>Choosing</h2>
              <p>
                Pick a height source from how people come back to the history,
                then read the cost column on your own run. The two controls stay
                in the picker so you can see what a cheap jump and a lying zero
                look like; they are not options to ship.
              </p>
              <div
                className={styles.tableScroll}
                tabIndex={0}
                role="region"
                aria-label="Height-source tradeoffs"
              >
                <table>
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Useful when</th>
                      <th>Cost to watch</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th>TanStack Virtual, measured after mount</th>
                      <td>
                        You already virtualize, and paying the discovery cost
                        each visit is acceptable.
                      </td>
                      <td>Rows re-measured and pixels fixed per visit.</td>
                    </tr>
                    <tr>
                      <th>Heights this browser measured before</th>
                      <td>The same browser revisits the same widths.</td>
                      <td>
                        Coverage, invalidation, device-local storage, and
                        scroll-time writes on a cold cache.
                      </td>
                    </tr>
                    <tr>
                      <th>Heights measured on the server</th>
                      <td>
                        Positions need to be right on a first visit or another
                        device.
                      </td>
                      <td>
                        Preparing and transferring geometry; all 20 tables with
                        the page can delay first content.
                      </td>
                    </tr>
                    <tr>
                      <th>Heights + rendered HTML from the server</th>
                      <td>Rich bodies are costly to regenerate on jump.</td>
                      <td>Fetching missing HTML in time.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                The controls, as a footnote: no virtualization trades DOM for
                jump time; the content-type guess trades corrections for
                clipping. Neither answers where the height comes from.
              </p>
              <p>
                You can compose them. Better estimates on the baseline, IndexedDB
                in front of server tables, or one width on the wire with the
                rest fetched on resize are all in bounds. Find the part that is
                actually expensive on your corpus, then check that changing it
                does not clip content or move the reader.
              </p>
            </section>
          </article>
        </div>
      </div>
    </main>
  )
}
