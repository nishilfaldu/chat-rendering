"use client"

import type { ReactNode } from "react"

export function ChatFrame({ children }: { children: ReactNode }) {
  return (
    <div
      data-chat-frame=""
      data-embedded="true"
      className="relative flex h-full min-h-0 flex-col bg-background"
    >
      {children}
    </div>
  )
}
