"use client"

import { useCallback, useMemo } from "react"
import { BenchProvider, useBench } from "@/lib/bench"
import { MessageBubble } from "@/components/message-bubble"

import type {
  HtmlIndexedMessage,
  MarkdownIndexedMessage,
  SavedHtmlPayload,
  SavedMeasurementsPayload,
} from "@/lib/build-index"

import { ChatRuntime } from "./chat-runtime"
import { SavedGeometrySurface } from "./saved-geometry"
import { usePagedHtml } from "./use-paged-html"

function cacheLabel(payload: SavedMeasurementsPayload | SavedHtmlPayload) {
  if (payload.warm) return "warm" as const
  if (payload.measuredCount > 0) return "partial" as const
  return "cold" as const
}

function SavedMarkdownSurface({
  payload,
  persistMeasurements,
}: {
  payload: SavedMeasurementsPayload
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
      <SavedGeometrySurface
        messages={payload.messages}
        index={payload.index}
        initialWindowStart={payload.initialWindowStart}
        persistMeasurements={persistMeasurements}
        renderMessage={renderMessage}
      />
    </ChatRuntime>
  )
}

function SavedHtmlSurface({
  payload,
  persistMeasurements,
}: {
  payload: SavedHtmlPayload
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
      <SavedGeometrySurface
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

export function SavedServerApp({
  payload,
  persistMeasurements = true,
}: {
  payload: SavedMeasurementsPayload | SavedHtmlPayload
  persistMeasurements?: boolean
}) {
  return (
    <BenchProvider
      appId={payload.mode}
      cache={cacheLabel(payload)}
      serverQueryMs={payload.serverQueryMs}
    >
      {payload.mode === "saved-html" ? (
        <SavedHtmlSurface
          payload={payload}
          persistMeasurements={persistMeasurements}
        />
      ) : (
        <SavedMarkdownSurface
          payload={payload}
          persistMeasurements={persistMeasurements}
        />
      )}
    </BenchProvider>
  )
}
