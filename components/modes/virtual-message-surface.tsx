"use client"

import type { CSSProperties, ReactNode } from "react"
import type { VirtualItem } from "@tanstack/react-virtual"
import type { SeedMessage } from "@/lib/seed"
import { MessageBubble } from "@/components/message-bubble"
import type { MessageBubbleContent } from "@/components/message-bubble"

import { useChatRuntime } from "./chat-runtime"

export function VirtualMessageSurface({
  totalSize,
  items,
  messages,
  measureElement,
  rowStyle,
  contentFor,
  contentHashFor,
}: {
  totalSize: number
  items: VirtualItem[]
  messages: SeedMessage[]
  measureElement?: (element: HTMLDivElement | null) => void
  rowStyle?: (row: VirtualItem, streaming: boolean) => CSSProperties | undefined
  contentFor: (message: SeedMessage, rowIndex: number) => MessageBubbleContent
  contentHashFor?: (rowIndex: number) => number | undefined
}) {
  const { streaming } = useChatRuntime()
  return (
    <VirtualRows
      totalSize={totalSize}
      items={items}
      messages={messages}
      measureElement={measureElement}
      rowStyle={rowStyle}
      renderMessage={(message, rowIndex, streamingThis) => (
        <MessageBubble
          message={message}
          content={contentFor(message, rowIndex)}
          contentHash={contentHashFor?.(rowIndex)}
          streamingText={streamingThis ? streaming?.text : undefined}
        />
      )}
    />
  )
}

export function markdownMessageContent(
  message: SeedMessage
): MessageBubbleContent {
  return { kind: "markdown", markdown: message.text }
}

export function VirtualRows<
  Message extends { id: string; heightClass: string },
>({
  totalSize,
  items,
  messages,
  measureElement,
  rowStyle,
  renderMessage,
}: {
  totalSize: number
  items: VirtualItem[]
  messages: Message[]
  measureElement?: (element: HTMLDivElement | null) => void
  rowStyle?: (row: VirtualItem, streaming: boolean) => CSSProperties | undefined
  renderMessage: (
    message: Message,
    rowIndex: number,
    streaming: boolean
  ) => ReactNode
}) {
  const { streaming } = useChatRuntime()
  return (
    <div
      data-chat-list=""
      style={{ height: `${totalSize}px`, width: "100%", position: "relative" }}
    >
      {items.map((row) => {
        const message = messages[row.index]
        if (!message) return null
        const streamingThis = streaming?.id === message.id
        return (
          <div
            key={row.key}
            ref={measureElement}
            data-index={row.index}
            data-height-class={message.heightClass}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${row.start}px)`,
              ...rowStyle?.(row, streamingThis),
            }}
          >
            {renderMessage(message, row.index, streamingThis)}
          </div>
        )
      })}
    </div>
  )
}
