"use client"

import type { SeedMessage } from "@chat-surface-bench/seed"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { MarkdownBody } from "@workspace/ui/components/markdown-body"
import { cn } from "@workspace/ui/lib/utils"

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
      className={cn("flex w-full gap-2 px-4 py-2", mine ? "justify-end" : "justify-start")}
    >
      {mine ? null : (
        <Avatar className="mt-1 size-7">
          <AvatarFallback className="font-mono text-[10px]">A</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[min(42rem,85%)] rounded-xl border px-3 py-2",
          mine ? "border-primary/30 bg-primary/10" : "border-border bg-card"
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
