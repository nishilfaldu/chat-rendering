"use client"

import { hashContent, type SeedMessage } from "@/lib/seed"

import { MarkdownBody } from "@/components/markdown-body"

export type MessageBubbleContent =
  | { kind: "markdown"; markdown: string }
  | { kind: "html"; html: string | null }

type MessageMetadata = Omit<SeedMessage, "text">

export function MessageBubble({
  message,
  content,
  streamingText,
  contentHash,
}: {
  message: MessageMetadata
  content: MessageBubbleContent
  streamingText?: string
  contentHash?: number
}) {
  const mine = message.role === "user"
  const markdown = content.kind === "markdown" ? content.markdown : ""
  const body = streamingText ?? markdown
  const renderedHtml = content.kind === "html" ? content.html : null
  return (
    <article
      style={
        content.kind === "html" &&
        content.html === null &&
        streamingText === undefined
          ? { minHeight: "inherit" }
          : undefined
      }
      data-message-id={message.id}
      data-role={message.role}
      aria-label={mine ? "You" : "Assistant"}
      data-content-hash={
        contentHash ??
        (content.kind === "markdown"
          ? hashContent(content.markdown)
          : undefined)
      }
      data-kind={message.kind}
      data-height-class={message.heightClass}
      className="csb-message"
    >
      <div className="csb-message-content">
        {renderedHtml !== null && streamingText === undefined ? (
          <div
            data-message-body=""
            className="csb-md text-sm leading-6"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        ) : content.kind === "html" && streamingText === undefined ? (
          <div
            data-message-body=""
            data-content-pending=""
            className="csb-md min-h-6 text-sm leading-6 text-muted-foreground"
            aria-label="message content loading"
          >
            content loading…
          </div>
        ) : (
          <MarkdownBody
            text={body}
            streaming={streamingText !== undefined}
            imageWidth={message.imageWidth}
            imageHeight={message.imageHeight}
          />
        )}
      </div>
    </article>
  )
}
