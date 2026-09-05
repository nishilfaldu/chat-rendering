"use client"

import { useMemo } from "react"
import type { SeedMessage } from "@/lib/seed"
import { BenchProvider } from "@/lib/bench"
import { MessageList } from "@/components/message-list"

import {
  ChatRuntime,
  useChatRuntime,
  useChatRuntimeController,
  type ChatRuntimeController,
} from "./chat-runtime"

function EveryMessageSurface({ messages }: { messages: SeedMessage[] }) {
  const { scrollElement, streaming } = useChatRuntime()
  const controller = useMemo<ChatRuntimeController>(
    () => ({
      kind: "natural",
      scrollToIndex: (rowIndex) => {
        const message = messages[rowIndex]
        if (!message || !scrollElement) return
        scrollElement
          .querySelector(`[data-message-id="${CSS.escape(message.id)}"]`)
          ?.scrollIntoView()
      },
    }),
    [messages, scrollElement]
  )
  useChatRuntimeController(controller)
  return <MessageList messages={messages} streaming={streaming} />
}

export function EveryMessageApp({
  messages,
  serverQueryMs = null,
}: {
  messages: SeedMessage[]
  serverQueryMs?: number | null
}) {
  return (
    <BenchProvider appId="every-message" cache="n/a" serverQueryMs={serverQueryMs}>
      <ChatRuntime lastMessage={messages.at(-1) ?? null}>
        <EveryMessageSurface messages={messages} />
      </ChatRuntime>
    </BenchProvider>
  )
}
