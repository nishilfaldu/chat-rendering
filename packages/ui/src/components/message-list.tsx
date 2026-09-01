"use client"

import type { CSSProperties, Ref } from "react"
import type { SeedMessage } from "@chat-surface-bench/seed"

import { MessageBubble } from "@workspace/ui/components/message-bubble"
import { cn } from "@workspace/ui/lib/utils"

export type ChatStreaming = {
  id: string
  text: string
}

export function MessageList({
  messages,
  htmlById,
  streaming,
  className,
  style,
  listRef,
}: {
  messages: readonly SeedMessage[]
  htmlById?: ReadonlyMap<string, string>
  streaming?: ChatStreaming | null
  className?: string
  style?: CSSProperties
  listRef?: Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={listRef}
      data-chat-list=""
      className={cn("flex flex-col py-2", className)}
      style={style}
    >
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          html={htmlById?.get(message.id)}
          streamingText={streaming?.id === message.id ? streaming.text : undefined}
        />
      ))}
    </div>
  )
}
