"use client"

import type { SeedMessage } from "@chat-surface-bench/seed"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { MarkdownBody } from "@workspace/ui/components/markdown-body"
import { cn } from "@workspace/ui/lib/utils"

function bubbleKindClass(kind: SeedMessage["kind"]): string {
  switch (kind) {
    case "short":
      return "max-w-[min(28rem,80%)] py-1.5"
    case "paragraph":
      return "max-w-[min(42rem,85%)] py-2"
    case "code":
      return "max-w-[min(52rem,92%)] py-2"
    case "image":
      return "max-w-[min(36rem,85%)] py-2"
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

export function MessageBubble({
  message,
  html,
  streamingText,
}: {
  message: SeedMessage
  html?: string
  streamingText?: string
}) {
  const mine = message.role === "user"
  const body = streamingText ?? message.text
  return (
    <article
      data-message-id={message.id}
      data-kind={message.kind}
      data-height-class={message.heightClass}
      className={cn("flex w-full gap-2 px-4 py-2", mine ? "justify-end" : "justify-start")}
    >
      {mine ? null : (
        <Avatar className="mt-1 size-7">
          <AvatarFallback className="font-mono text-[10px]">A</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "rounded-xl border px-3",
          mine ? "border-primary/30 bg-primary/10" : "border-border bg-card",
          bubbleKindClass(message.kind)
        )}
      >
        <div className="text-muted-foreground mb-1 flex items-center gap-2 font-mono text-[10px] tracking-wide uppercase">
          <span>{message.role}</span>
          <span>{message.id}</span>
          <span>{message.kind}</span>
        </div>
        {html && streamingText === undefined ? (
          <div className="csb-md text-sm leading-6" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <MarkdownBody
            text={body}
            streaming={streamingText !== undefined}
            imageWidth={message.imageWidth}
            imageHeight={message.imageHeight}
          />
        )}
      </div>
      {mine ? (
        <Avatar className="mt-1 size-7">
          <AvatarFallback className="font-mono text-[10px]">U</AvatarFallback>
        </Avatar>
      ) : null}
    </article>
  )
}
