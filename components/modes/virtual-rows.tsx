"use client"

import type { CSSProperties, ReactNode } from "react"
import type { VirtualItem } from "@tanstack/react-virtual"

import { useChatRuntime } from "./chat-runtime"

export function VirtualRows<Message extends { id: string; heightClass: string }>({
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
    streamingText: string | undefined
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
            {renderMessage(
              message,
              row.index,
              streamingThis ? streaming?.text : undefined
            )}
          </div>
        )
      })}
    </div>
  )
}
