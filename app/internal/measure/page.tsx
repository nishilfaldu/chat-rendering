import { MessageBubble } from "@/components/message-bubble"
import {
  hashContent,
  isWidthBucket,
  widthBucket,
  type WidthBucket,
} from "@/lib/seed"
import { listMessages, listPrerenderedHtml } from "@/lib/seed/db"

export const dynamic = "force-dynamic"

function parseBucket(value: string | undefined): WidthBucket {
  const n = Number(value)
  return isWidthBucket(n) ? n : widthBucket(800)
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>
}) {
  const params = await searchParams
  const width = parseBucket(params.w)
  const messages = listMessages()
  const html = listPrerenderedHtml()
  return (
    <div
      id="measure-root"
      data-measure-root=""
      data-width={width}
      style={{ width }}
    >
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          content={{ kind: "html", html: html.get(message.id) ?? null }}
          contentHash={hashContent(message.text)}
        />
      ))}
    </div>
  )
}
