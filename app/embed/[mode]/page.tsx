import { notFound } from "next/navigation"

import { renderConversation } from "@/lib/conversation"
import type { ModePageParams } from "@/lib/mode-page"
import { isChatAppId } from "@/lib/chat-implementations"

export const dynamic = "force-dynamic"

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ mode: string }>
  searchParams: ModePageParams
}) {
  const { mode } = await params
  if (!isChatAppId(mode)) notFound()
  return renderConversation(mode, searchParams)
}
