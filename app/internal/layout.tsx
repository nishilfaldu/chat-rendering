import type { Metadata } from "next"

import { SITE_NAME } from "@/lib/site"

export const metadata: Metadata = {
  title: { absolute: SITE_NAME },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
}

export default function InternalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
