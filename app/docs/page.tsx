import type { Metadata } from "next"
import Link from "next/link"
import styles from "./docs.module.css"

export const metadata: Metadata = {
  title: "How it works · Chat rendering",
  description:
    "Six approaches to rendering long conversations. Explore the browser pipeline, virtualization, scroll anchoring, and the tradeoffs of reusing heights and HTML.",
}

const chapters = [
  ["starting-point", "A long conversation"],
  ["every-message", "Every message"],
  ["pixels", "From a message to pixels"],
  ["measured", "Measured in the browser"],
  ["anchoring", "Keeping your place"],
  ["estimated", "Estimated by content type"],
  ["browser-cache", "Saved in this browser"],
  ["saved-measurements", "Saved measurements"],
  ["saved-html", "Saved measurements + HTML"],
  ["streaming", "While a response streams"],
  ["choosing", "Choosing an approach"],
] as const

export default function DocsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/">Chat rendering</Link>
          <Link href="/">
            Open the experiment <span aria-hidden="true"/>
          </Link>
        </header>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <nav aria-label="On this page">
              <p>How it works</p>
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
            <header className={styles.intro} id="starting-point">
              <h1>Rendering long conversations</h1>
              <p>
                Chat looks pretty simple at first. You put some messages on a
                page and scroll through them. But once the conversation gets
                long, there’s quite a bit going on underneath.
              </p>
              <p>
                Some messages are a sentence long. Others have paragraphs, code
                blocks, or images. A response might still be streaming while
                you’re reading something further up. And if you jump to message
                8,000, you probably expect it to appear without the page moving
                around afterward.
              </p>
              <p>
                I built <Link href="/">this experiment</Link> with 10,000
                messages and six implementations to work through those problems.
                We’ll start by rendering everything, then change one part of the
                approach at a time and see what that buys us and what we have to
                deal with next.
              </p>
              <p>
                You can try the implementations as you read.
                {/* I’m mostly
                interested in how quickly you get to the content, whether moving
                through it feels smooth, and whether you lose your place when
                something changes. */}
              </p>
            </header>

            <section id="every-message">
              <h2>Every message</h2>
              <p>
                Let’s start simple. We’ve got 10,000 messages, and in this first
                implementation, we’re rendering every single one. React produces
                the UI for all of them, and the browser creates the DOM nodes,
                lays out the messages, and keeps that structure around. You
                might only be looking at twenty messages, but the rest are still
                there.
              </p>
              <p>
                The upside is that everything already exists. If I jump to
                message 8,000, the app can find its element and scroll there. It
                doesn’t have to mount that message first or work out where it
                belongs from an estimate.
              </p>
              <p>
                But we’ve paid for that up front. There’s more document work
                during startup and more to keep in memory. A code-heavy message
                can contain lots of individual elements, so 10,000 messages can
                mean a much larger DOM than the number suggests. The browser can
                skip some offscreen drawing work, but we’re still keeping the
                entire document available.
              </p>
              <p>
                For a short conversation, that’s probably fine. Here, though,
                we’re doing a lot of work for messages the reader may never see.
                So before trying to make all 10,000 faster to render, let’s ask
                whether we need them all mounted at the same time.
              </p>
            </section>

            <section id="pixels">
              <h2>From a message to pixels</h2>
              <p>
                Before we change how many messages we render, let’s follow one
                through the browser. React works out the UI and commits changes
                to the DOM, the browser’s tree of elements and text. When we
                supply HTML, the browser parses that markup into nodes.
                JavaScript can create and update those nodes too.
              </p>
              <p>
                Next, the browser works out the styles: which font to use, the
                width of the message, its padding, and so on. Layout uses those
                styles to work out where everything goes, including where text
                wraps. Paint recording then produces drawing instructions for
                that content. These are still instructions, rather than the
                colored pixels you see.
              </p>
              <p>
                Rasterization is the step that turns drawing instructions into
                pixel values in memory. Think of drawing a letter: the result
                needs to describe the color and coverage of the pixels making up
                its shape. That pixel data can be stored in a bitmap or GPU
                texture before it becomes part of a displayed frame.
              </p>
              <p>
                The browser divides large rendered surfaces into smaller regions
                called tiles. Each tile contains many pixels. For example, a 256
                × 256 tile contains 65,536 pixels; that’s an example size, not a
                fixed rule. Tiles are the pieces being rasterized, rather than
                something the GPU has to create after rasterization.
              </p>
              <p>
                This division gives the browser separate jobs to schedule. It
                can work on tiles in parallel where resources allow, prioritize
                ones near the viewport, and reuse tiles that haven’t changed. So
                parallelism is part of the reason for tiling, alongside avoiding
                work on areas we don’t need yet.
              </p>
              <h3>Who does that work?</h3>
              <p>
                In Chromium, JavaScript, style calculations, layout, and paint
                recording run on the renderer’s main thread. Raster workers are
                separate CPU threads, so their work doesn’t have to run on the
                same thread as our JavaScript.
              </p>
              <p>
                But a CPU-side raster thread doesn’t mean all rasterization
                happens on the CPU. A CPU raster path can produce pixel data
                that is uploaded for use by the GPU. With GPU rasterization,
                drawing commands produce that data using the GPU. We shouldn’t
                describe the CPU-to-bitmap-to-upload path as the only way it
                works.
              </p>
              <p>
                The compositor coordinates the visual pieces: which tiles to
                use, where to place them, and how to clip or transform them. The
                resulting frame is drawn using the GPU for presentation. When
                the needed tiles are already available, scrolling can reuse them
                at new positions instead of drawing their contents from scratch.
              </p>
              <p>
                That’s why a page can sometimes keep scrolling while JavaScript
                is busy. It still depends on having the content ready. If our
                app hasn’t mounted the next message, separate raster workers and
                a fast GPU can’t supply the missing message for us.
              </p>
            </section>

            <section id="measured">
              <h2>Measured in the browser</h2>
              <p>
                With virtualization, we mount just the messages around the
                viewport. As you scroll, we remove rows you’ve left behind and
                mount the ones you’re approaching. We keep a few extra rows just
                outside the visible area to give ourselves some breathing room.
                That buffer is called overscan. I’m using TanStack Virtual to
                manage this window.
              </p>
              <p>
                That makes the DOM much smaller. But now suppose I ask it to
                jump to message 8,000. That message isn’t mounted, and neither
                are most of the messages before it. We still need to work out
                how far down to scroll to reach it.
              </p>

              <p>
                To place a message, we add up the heights before it. The problem
                is that we haven’t measured most of them yet. This
                implementation starts with an 80 px guess for each unknown
                message. Once a row appears, we measure it. If it turns out to
                be 240 px tall, we need to add 160 px to our model of that row.
              </p>
              <p>
                Now imagine making slightly wrong guesses thousands of times
                before the message you want. Those errors can add up. We’ve
                reduced the mounted document, but we’ve made navigating through
                it more complicated. We also still hold the full message data in
                this version; a smaller DOM doesn’t mean every part of memory
                use is now bounded.
              </p>
              <details>
                <summary>How measurement can occupy the main thread</summary>
                <p>
                  When we ask for a row’s size with{" "}
                  <code>getBoundingClientRect()</code>, the browser may need to
                  finish pending style and layout work before it can answer. If
                  we keep changing the DOM and immediately measuring it, we can
                  force that work repeatedly. That’s layout thrashing. We need
                  measurements here, but we want to be careful about when and
                  how often we ask for them.
                </p>
              </details>
              <p>
                For a lot of chat interfaces, measuring in the browser is a
                reasonable place to start. You get to use the real layout
                instead of predicting every possible message shape. You do have
                to handle what happens when a measurement changes your earlier
                guess.
              </p>
              <details>
                <summary>
                  How the scrollbar represents unmounted messages
                </summary>
                <p>
                  The browser doesn’t know our array has 10,000 messages. It
                  only knows the scrollable space we’ve given it. So we create a
                  tall spacer to stand in for the whole history and position the
                  mounted messages inside it. Otherwise, the scrollbar would
                  only have enough range for our small window of rows.
                </p>
                <pre>
                  <code>{`message top = sum of the heights before it
scroll range ≈ total content height − viewport height`}</code>
                </pre>
              </details>
            </section>

            <section id="anchoring">
              <h2>Keeping your place</h2>
              <p>
                Imagine you’ve scrolled up to read an older answer. A code block
                above it finishes rendering and becomes 30 px taller. That extra
                height pushes the answer you’re reading down by 30 px, so you
                lose your place.
              </p>
              <p>
                We can counter that by scrolling down by the same 30 px. The
                content moves down, the scroll position follows it, and the
                answer stays where it was on your screen. That’s the basic idea
                of scroll anchoring.
              </p>
              <p>
                The property we change is <code>scrollTop</code>: how far the
                container has scrolled down its content. If it was 500 px before
                the correction, we make it 530 px afterward. The two changes
                cancel each other out when applied together.
              </p>
              <p>
                Resizing needs similar care because text wraps differently. Here
                we remember a visible message and restore its position after the
                width changes. If you start scrolling yourself, we stop
                restoring so the app doesn’t fight you. This keeps track of the
                message, though, not the exact word you were reading inside it.
              </p>
            </section>

            <section id="estimated">
              <h2>Estimated by content type</h2>
              <p>
                The 80 px guess is pretty rough. We already know something about
                each message, so can we use that to start closer to the real
                height? This version puts messages into five size classes based
                on text length, code structure, and image proportions, then
                adjusts the estimate for the width.
              </p>
              <p>
                I’ve deliberately made this version a little extreme. Once it
                picks a height for a completed message, it keeps that height and
                hides anything that overflows. It doesn’t measure the content
                and correct the guess. The streaming row is allowed to grow.
              </p>
              <p>
                So you can get zero height corrections while part of a paragraph
                is missing. That was a useful check on the experiment: the
                number looks good because we’ve stopped doing something
                necessary. It doesn’t tell us that the estimate was right.
              </p>
              <p>
                If your rows really have fixed heights, or you intend to
                truncate them, that can be fine. For these complete messages,
                I’d use the estimate to help a measuring virtualizer get
                started, then let it correct whatever we got wrong.
              </p>
            </section>

            <section id="browser-cache">
              <h2>Saved in this browser</h2>
              <p>
                At this point, the browser has already done some useful work.
                It’s rendered messages, measured them, and produced their HTML.
                If I close the conversation and come back, do we really need to
                start over? This version saves heights and HTML in IndexedDB,
                the browser’s local database.
              </p>
              <p>
                If we’ve seen the message at this width, we can start with its
                saved height and HTML. Otherwise, we estimate and measure it
                normally. Width still matters even when the messages stay the
                same: a paragraph can take more lines in a narrow window.
              </p>
              <p>
                I wait about 500 ms for an eligible row to settle before saving
                it. A row that’s still streaming, or disappears before then, may
                not be saved. So this helps with work we’ve actually had a
                chance to learn and store, and reading and writing that cache
                adds work of its own.
              </p>
              <p>
                This makes sense when you keep returning to the same
                conversation in the same browser. Open it on another device,
                clear storage, or use a width we haven’t measured, and we’re
                back to learning at least some of those heights again.
              </p>
            </section>

            <section id="saved-measurements">
              <h2>Saved measurements</h2>
              <p>
                The browser cache helps after this browser has seen a message.
                To reuse that work on another device or a later visit without
                the local cache, we can send the measured heights back to the
                server too.
              </p>
              <p>
                In a real application, you might fetch a page of messages with
                any saved heights the server already has. The browser renders
                the visible rows, measures them, and sends back missing or
                corrected heights. A later request can include those
                measurements alongside the messages. You don’t need to fetch or
                render the whole history to start collecting them.
              </p>
              <p>
                On the very first visit, someone still has to measure the
                content. A server can’t know its rendered height just from
                fetching the text. And the measurements need to match the width
                and styling closely enough to be useful. We still let the actual
                browser correct them.
              </p>
              <p>
                For this demo, I prepare the heights ahead of time with a
                headless browser and store them on the server. That lets you try
                the approach immediately, without first visiting every message
                to populate it. Preparing them in advance is how I set up the
                experiment; collecting them from real visits is another way to
                build the same store.
              </p>
              <p>
                The client receives heights and starting positions. A starting
                position is just the sum of the heights before that message. So
                even when message 8,000 isn’t mounted, we have a better idea of
                where to put it.
              </p>
              <p>
                There’s a cost to sending all of that. This implementation
                includes measurements for all 20 supported widths, along with
                message data. The server has to build the response, and the
                client has to download, parse, and keep it. Sending just the
                current width could reduce the initial payload, but a resize
                might then need another request.
              </p>
              <p>
                Saving these heights in IndexedDB as well would add a local
                cache to the server-backed approach. The two can work together,
                but they do different jobs: IndexedDB remembers what this
                browser knows, while the server can share measurements across
                visits and devices.
              </p>
            </section>

            <section id="saved-html">
              <h2>Saved measurements + HTML</h2>
              <p>
                We’re already reusing heights. What else are we asking the
                browser to do again? For these messages, Markdown conversion and
                syntax highlighting are another chunk of work. The last version
                saves the rendered HTML too, and fetches message bodies as we
                need them.
              </p>
              <p>
                It starts with HTML for the last 48 messages, then requests
                bodies around the visible range or a jump target. It keeps a
                working set of 160 HTML entries. The full list of message
                details and saved positions is still there, so this limits the
                body cache rather than all memory use.
              </p>
              <p>
                This creates an interesting situation: we can know where a
                message belongs before we have anything to put there. If you
                scroll faster than the bodies arrive, the row can stay in the
                right place while you wait for its content. Fetching further
                ahead might help, but we’d also download messages you might
                never read.
              </p>
              <p>
                And when the HTML does arrive, there’s still work to do. The
                browser parses it into DOM nodes, works out styles and line
                breaks, and draws the result. We’ve saved some Markdown and
                highlighting work; we haven’t saved a picture that the browser
                can simply put on screen.
              </p>
              <p>
                I’d look at this when rendering message bodies is a substantial
                cost. But I’d watch the bodies arrive as well as the frame
                readings. A conversation can move smoothly while it’s still
                waiting to show you the answer you came for.
              </p>
            </section>

            <section id="streaming">
              <h2>While a response streams</h2>
              <p>
                So far we’ve mostly talked about completed messages. A streaming
                response keeps changing while you’re looking at it. Here I
                replay text locally in whitespace and non-whitespace chunks with
                a nominal 16 ms delay. There’s no model request, and these
                chunks aren’t model tokens.
              </p>
              <p>
                As text arrives, a paragraph can wrap onto another line or a
                code block can grow. The code tokenizer processes new text
                incrementally, but the surrounding Markdown and React work can
                still grow with the response. Calling an API asynchronously
                doesn’t, on its own, move the computation off the main thread.
              </p>
              <p>
                Then there’s what you want the scroll position to do. If you’re
                at the bottom, you probably want to follow the answer. If you’ve
                scrolled up to read an earlier message, you probably want to
                stay there. This implementation releases bottom-following when
                you move into history and restores it when you return to Latest.
              </p>
              <p>
                Try starting the stream, scrolling up, and pausing on a message.
                Then return to Latest. Those are two different situations the UI
                needs to handle, even though the same response is growing in
                both.
              </p>
            </section>

            <section id="choosing">
              <h2>Choosing an approach</h2>
              <p>
                If I were choosing one of these for a real chat interface, I’d
                start with how people use it. A short support conversation and a
                long history full of code don’t necessarily need the same
                solution. This is how I’d think about the starting points:
              </p>
              <div
                className={styles.tableScroll}
                tabIndex={0}
                role="region"
                aria-label="Implementation tradeoffs"
              >
                <table>
                  <thead>
                    <tr>
                      <th>Approach</th>
                      <th>Useful when</th>
                      <th>Cost to watch</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th>Every message</th>
                      <td>History is short and simplicity matters.</td>
                      <td>Upfront document work and retention.</td>
                    </tr>
                    <tr>
                      <th>Measured</th>
                      <td>Long messages vary and change.</td>
                      <td>Discovering and correcting geometry.</td>
                    </tr>
                    <tr>
                      <th>Estimated</th>
                      <td>Row sizes or truncation are deliberate.</td>
                      <td>Incorrect or clipped content.</td>
                    </tr>
                    <tr>
                      <th>Browser cache</th>
                      <td>The same browser revisits history.</td>
                      <td>Coverage, invalidation, and storage.</td>
                    </tr>
                    <tr>
                      <th>Saved measurements</th>
                      <td>Stable history needs reliable positions.</td>
                      <td>Preparing and transferring geometry.</td>
                    </tr>
                    <tr>
                      <th>Saved HTML</th>
                      <td>Rich bodies are costly to regenerate.</td>
                      <td>Fetching missing content in time.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                You also don’t have to take any of these versions exactly as
                they are. You could give the measured version better estimates,
                cache only frequently visited rows, or send server geometry for
                one width. I’d first find the part that’s actually causing
                trouble, then check that changing it helps without losing
                content or moving the reader around.
              </p>
            </section>
          </article>
        </div>
      </div>
    </main>
  )
}
