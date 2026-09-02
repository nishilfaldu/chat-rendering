import { MessageBubble } from "@workspace/ui/components/message-bubble"
import { WIDTH_BUCKETS, type WidthBucket } from "@chat-surface-bench/seed"
import { listMessages, listPrerenderedHtml } from "@chat-surface-bench/seed/db"

export const dynamic = "force-dynamic"

function parseBucket(value: string | undefined): WidthBucket {
  const n = Number(value)
  if ((WIDTH_BUCKETS as readonly number[]).includes(n)) {
    return n as WidthBucket
  }
  return 800
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
    <div id="measure-root" data-measure-root="" data-width={width} style={{ width }}>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} html={html.get(message.id)} />
      ))}
    </div>
  )
}
