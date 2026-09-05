"use client"

import {
  estimatePx,
  type SeedMessage,
  type WidthBucket,
} from "@/lib/seed"
import { BenchProvider } from "@/lib/bench"
import { MessageBubble } from "@/components/message-bubble"

import { ChatRuntime, useChatRuntime } from "./chat-runtime"
import { useVirtualChat } from "./use-virtual-chat"
import { VirtualRows } from "./virtual-rows"

function classSize(
  message: SeedMessage | undefined,
  bucket: WidthBucket
): number {
  return estimatePx(message?.heightClass ?? "sm", bucket)
}

function EstimatedSurface({ messages }: { messages: SeedMessage[] }) {
  const { scrollElement, widthBucket: bucket } = useChatRuntime()
  const virtual = useVirtualChat({
    messages,
    estimateSize: (rowIndex) => classSize(messages[rowIndex], bucket),
    enabled: scrollElement !== null,
  })

  return (
    <VirtualRows
      totalSize={virtual.totalSize}
      items={virtual.items}
      messages={messages}
      measureElement={virtual.measureElement}
      rowStyle={(row, streamingThis) => ({
        height: streamingThis ? undefined : `${row.size}px`,
        overflow: streamingThis ? "visible" : "hidden",
      })}
      renderMessage={(message, _rowIndex, streamingText) => (
        <MessageBubble
          message={message}
          content={{ kind: "markdown", markdown: message.text }}
          streamingText={streamingText}
        />
      )}
    />
  )
}

export function EstimatedApp({
  messages,
  serverQueryMs = null,
}: {
  messages: SeedMessage[]
  serverQueryMs?: number | null
}) {
  return (
    <BenchProvider
      appId="estimated"
      cache="n/a"
      serverQueryMs={serverQueryMs}
    >
      <ChatRuntime lastMessage={messages.at(-1) ?? null}>
        <EstimatedSurface messages={messages} />
      </ChatRuntime>
    </BenchProvider>
  )
}
