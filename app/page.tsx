import type { Metadata } from "next"

import { ChatRenderingDemo } from "@/components/demo/chat-rendering-demo"
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  REPOSITORY_URL,
} from "@/lib/site"

export const metadata: Metadata = {
  title: { absolute: `${SITE_TITLE} · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Chat rendering experiment showing geometry and HTML reuse across a virtualized conversation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
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
  other: { "github:repository": REPOSITORY_URL },
}

export default function Page() {
  return <ChatRenderingDemo />
}
