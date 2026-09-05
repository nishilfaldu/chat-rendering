"use client"

import type { ReactNode, Ref, UIEventHandler } from "react"

import { cn } from "@/lib/utils"

export function ChatColumn({
  scrollRef,
  onScroll,
  children,
  className,
}: {
  scrollRef?: Ref<HTMLDivElement>
  onScroll?: UIEventHandler<HTMLDivElement>
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div
        ref={scrollRef}
        data-chat-scroll=""
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
      >
        <div
          data-chat-content=""
          className="mx-auto min-h-full"
          style={{ width: "min(928px, round(down, 100%, 32px))" }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
