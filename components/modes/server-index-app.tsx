"use client"

import { useCallback, useMemo } from "react"
import { BenchProvider, useBench } from "@/lib/bench"
import { MessageBubble } from "@/components/message-bubble"

import type { HtmlIndexedMessage, ServerIndexPayload } from "@/lib/build-index"

import { ChatRuntime } from "./chat-runtime"
import { ServerGeometrySurface } from "./server-geometry"
import { usePagedHtml } from "./use-paged-html"

function RailgunMode({
  payload,
  persistMeasurements,
}: {
  payload: ServerIndexPayload
  persistMeasurements: boolean
}) {
  const { setHtmlCacheStats } = useBench()
  const initial = useMemo(
    () =>
      new Map(
        payload.messages.flatMap((message) =>
          message.content.html === null
            ? []
            : [[message.id, message.content.html] as const]
        )
      ),
    [payload.messages]
  )
  const html = usePagedHtml({
    initial,
    enabled: true,
    onStats: setHtmlCacheStats,
  })
  const contentReady = useCallback(
    (message: HtmlIndexedMessage) => html.has(message.id),
    [html]
  )
  const prepareContent = useCallback(
    async (messages: HtmlIndexedMessage[]) => {
      await html.ensure(messages.map((message) => message.id))
    },
    [html]
  )
  const observeContent = useCallback(
    (messages: HtmlIndexedMessage[]) => {
      html.observe(messages.map((message) => message.id))
    },
    [html]
  )
  const renderMessage = useCallback(
    (message: HtmlIndexedMessage, streamingText: string | undefined) => (
      <MessageBubble
        key={message.id}
        message={message}
        content={{ kind: "html", html: html.get(message.id) ?? null }}
        contentHash={message.contentHash}
        streamingText={streamingText}
      />
    ),
    [html]
  )

  return (
    <ChatRuntime lastMessage={payload.streamSource}>
      <ServerGeometrySurface
        messages={payload.messages}
        index={payload.index}
        initialWindowStart={payload.initialWindowStart}
        persistMeasurements={persistMeasurements}
        contentReady={contentReady}
        prepareContent={prepareContent}
        observeContent={observeContent}
        renderMessage={renderMessage}
      />
    </ChatRuntime>
  )
}

export function ServerIndexApp({
  payload,
  persistMeasurements = true,
}: {
  payload: ServerIndexPayload
  persistMeasurements?: boolean
}) {
  const cache = payload.warm
    ? "warm"
    : payload.measuredCount > 0
      ? "partial"
      : "cold"
  return (
    <BenchProvider
      appId="server-index"
      cache={cache}
      serverQueryMs={payload.serverQueryMs}
    >
      <RailgunMode
        payload={payload}
        persistMeasurements={persistMeasurements}
      />
    </BenchProvider>
  )
}
