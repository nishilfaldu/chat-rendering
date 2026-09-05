"use client"

import { useCallback } from "react"
import { BenchProvider } from "@/lib/bench"
import { MessageBubble } from "@/components/message-bubble"

import type {
  MarkdownIndexedMessage,
  ServerHeightsPayload,
} from "@/lib/build-index"

import { ChatRuntime } from "./chat-runtime"
import { ServerGeometrySurface } from "./server-geometry"

function ServerHeightsMode({
  payload,
  persistMeasurements,
}: {
  payload: ServerHeightsPayload
  persistMeasurements: boolean
}) {
  const renderMessage = useCallback(
    (message: MarkdownIndexedMessage, streamingText: string | undefined) => (
      <MessageBubble
        key={message.id}
        message={message}
        content={message.content}
        contentHash={message.contentHash}
        streamingText={streamingText}
      />
    ),
    []
  )
  const last = payload.messages.at(-1)
  return (
    <ChatRuntime
      lastMessage={last ? { id: last.id, text: last.content.markdown } : null}
    >
      <ServerGeometrySurface
        messages={payload.messages}
        index={payload.index}
        initialWindowStart={payload.initialWindowStart}
        persistMeasurements={persistMeasurements}
        renderMessage={renderMessage}
      />
    </ChatRuntime>
  )
}

export function ServerHeightsApp({
  payload,
  persistMeasurements = true,
}: {
  payload: ServerHeightsPayload
  persistMeasurements?: boolean
}) {
  const cache = payload.warm
    ? "warm"
    : payload.measuredCount > 0
      ? "partial"
      : "cold"
  return (
    <BenchProvider
      appId="server-heights"
      cache={cache}
      serverQueryMs={payload.serverQueryMs}
    >
      <ServerHeightsMode
        payload={payload}
        persistMeasurements={persistMeasurements}
      />
    </BenchProvider>
  )
}
