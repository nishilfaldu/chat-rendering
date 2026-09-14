import type { Metadata } from "next"

import { ChatRenderingDemo } from "@/components/demo/chat-rendering-demo"
import { SITE_NAME, REPOSITORY_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: { absolute: SITE_NAME },
  description: "How to render chat better than just virtualization alone.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: "How to render chat better than just virtualization alone.",
    images: [
      {
        url: "https://chat-rendering.nishilfaldu.site/og-image.png",
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
    images: [{ url: "https://chat-rendering.nishilfaldu.site/og-image.png", alt: "Chat rendering. How to render chat better than just virtualization alone." }],
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
