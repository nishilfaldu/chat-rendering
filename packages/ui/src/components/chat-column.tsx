"use client"

import type { ReactNode, Ref, UIEventHandler } from "react"

import { cn } from "@workspace/ui/lib/utils"

export function ChatColumn({
  scrollRef,
  onScroll,
  children,
  composer,
  className,
}: {
  scrollRef?: Ref<HTMLDivElement>
  onScroll?: UIEventHandler<HTMLDivElement>
  children: ReactNode
  composer?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div
        ref={scrollRef}
        data-chat-scroll=""
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
      >
        {children}
      </div>
      {composer}
    </div>
  )
}
