import type { Metadata } from "next"
import Link from "next/link"

import { AUTHOR, SITE_NAME, absoluteUrl, serializeJsonLd } from "@/lib/site"
import styles from "./notes.module.css"

const description =
  "Height sources and payload costs for TanStack Virtual, browser-cached geometry, server-precomputed measurements, and prerendered HTML."

export const metadata: Metadata = {
  title: { absolute: SITE_NAME },
  description,
  alternates: { canonical: "/notes" },
  openGraph: {
    type: "article",
    locale: "en_US",
    url: "/notes",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: "How to render chat better than just virtualization alone.",
    authors: [AUTHOR.url],
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Chat rendering. How to render chat better than just virtualization alone.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: "How to render chat better than just virtualization alone.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
}

export default function NotesPage() {
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Chat virtualization notes",
    description,
    url: absoluteUrl("/notes"),
    mainEntityOfPage: absoluteUrl("/notes"),
    author: {
      "@type": "Person",
      name: AUTHOR.name,
      url: AUTHOR.url,
    },
    publisher: {
      "@type": "Person",
      name: AUTHOR.name,
      url: AUTHOR.url,
    },
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl(),
    },
    about: [
      "Virtual scrolling",
      "Chat rendering",
      "Web performance",
      "TanStack Virtual",
    ],
    inLanguage: "en-US",
  }

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }}
      />
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

          <h2>Precomputed + prerendered HTML</h2>
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
