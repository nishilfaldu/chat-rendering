"use client"

import type { CSSProperties, Ref } from "react"
import type { SeedMessage } from "@/lib/seed"

import { MessageBubble } from "@/components/message-bubble"
import { cn } from "@/lib/utils"

export type ChatStreaming = {
  id: string
  text: string
}

export function MessageList({
  messages,
  streaming,
  className,
  style,
  listRef,
}: {
  messages: readonly SeedMessage[]
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
          content={{ kind: "markdown", markdown: message.text }}
          streamingText={
            streaming?.id === message.id ? streaming.text : undefined
          }
        />
      ))}
    </div>
  )
}
