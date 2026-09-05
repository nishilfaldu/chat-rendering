import { notFound, redirect } from "next/navigation"

import { renderConversation } from "@/lib/conversation"
import type { ModePageParams } from "@/lib/mode-page"
import { resolveChatAppId } from "@/lib/chat-implementations"

export const dynamic = "force-dynamic"

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ mode: string }>
  searchParams: ModePageParams
}) {
  const { mode } = await params
  const resolved = resolveChatAppId(mode)
  if (!resolved) notFound()
  if (resolved !== mode) {
    const query = await searchParams
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === "string" && value.length > 0) {
        search.set(key, value)
      }
    }
    const suffix = search.size > 0 ? `?${search.toString()}` : ""
    redirect(`/embed/${resolved}${suffix}`)
  }
  return renderConversation(resolved, searchParams)
}
