import type { ComponentType, ReactNode } from "react"
import { MeasuredApp } from "@/components/modes/measured-app"
import { EstimatedApp } from "@/components/modes/estimated-app"
import { EveryMessageApp } from "@/components/modes/every-message-app"
import { SavedInBrowserApp } from "@/components/modes/saved-in-browser-app"
import { SavedServerApp } from "@/components/modes/saved-server-app"
import {
  loadSavedHtmlPayload,
  loadSavedMeasurementsPayload,
  type SavedHtmlPayload,
  type SavedMeasurementsPayload,
} from "@/lib/build-index"
import { loadCanonicalMessagesTimed } from "@/lib/corpus"
import { loadModePage, type ModePageParams } from "@/lib/mode-page"
import type { ChatAppId } from "@/lib/chat-implementations"
import type { SeedMessage } from "@/lib/seed"

type MessageApp = ComponentType<{
  messages: SeedMessage[]
  serverQueryMs?: number | null
}>

function messagesPage(App: MessageApp) {
  return (searchParams: ModePageParams) =>
    loadModePage({
      searchParams,
      load: loadCanonicalMessagesTimed,
      render: ({ messages, serverQueryMs }) => (
        <App messages={messages} serverQueryMs={serverQueryMs} />
      ),
    })
}

function savedPage(
  load: (state: "saved" | "cold" | "partial") =>
    | SavedMeasurementsPayload
    | SavedHtmlPayload
) {
  return (searchParams: ModePageParams) =>
    loadModePage({
      searchParams,
      load,
      render: (payload, request) => (
        <SavedServerApp
          payload={payload}
          persistMeasurements={!request.benchmark && !request.simulated}
        />
      ),
    })
}

const CONVERSATIONS: Record<
  ChatAppId,
  (searchParams: ModePageParams) => Promise<ReactNode>
> = {
  "every-message": messagesPage(EveryMessageApp),
  measured: messagesPage(MeasuredApp),
  estimated: messagesPage(EstimatedApp),
  "saved-in-browser": messagesPage(SavedInBrowserApp),
  "saved-measurements": savedPage(loadSavedMeasurementsPayload),
  "saved-html": savedPage(loadSavedHtmlPayload),
}

export function renderConversation(
  mode: ChatAppId,
  searchParams: ModePageParams
) {
  return CONVERSATIONS[mode](searchParams)
}
