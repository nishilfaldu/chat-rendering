"use client"

import { useMemo } from "react"
import type { SeedMessage } from "@chat-surface-bench/seed"
import { BenchProvider } from "@chat-surface-bench/bench"
import { MessageList } from "@workspace/ui/components/message-list"

import {
  ChatRuntime,
  useChatRuntime,
  useChatRuntimeController,
  type ChatRuntimeController,
} from "./chat-runtime"

function NaiveSurface({ messages }: { messages: SeedMessage[] }) {
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

export function NaiveApp({
  messages,
  serverQueryMs = null,
}: {
  messages: SeedMessage[]
  serverQueryMs?: number | null
}) {
  return (
    <BenchProvider appId="naive" cache="n/a" serverQueryMs={serverQueryMs}>
      <ChatRuntime lastMessage={messages.at(-1) ?? null}>
        <NaiveSurface messages={messages} />
      </ChatRuntime>
    </BenchProvider>
  )
}
