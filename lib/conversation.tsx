import { MeasuredApp } from "@/components/modes/measured-app"
import { EstimatedApp } from "@/components/modes/estimated-app"
import { EveryMessageApp } from "@/components/modes/every-message-app"
import { SavedInBrowserApp } from "@/components/modes/saved-in-browser-app"
import { SavedMeasurementsApp } from "@/components/modes/saved-measurements-app"
import { SavedHtmlApp } from "@/components/modes/saved-html-app"
import {
  loadSavedMeasurementsPayload,
  loadSavedHtmlPayload,
} from "@/lib/build-index"
import { loadCanonicalMessagesTimed } from "@/lib/corpus"
import { loadModePage, type ModePageParams } from "@/lib/mode-page"
import type { ChatAppId } from "@/lib/chat-implementations"

export function renderConversation(
  mode: ChatAppId,
  searchParams: ModePageParams
) {
  switch (mode) {
    case "every-message":
      return loadModePage({
        searchParams,
        load: loadCanonicalMessagesTimed,
        render: ({ messages, serverQueryMs }) => (
          <EveryMessageApp messages={messages} serverQueryMs={serverQueryMs} />
        ),
      })
    case "measured":
      return loadModePage({
        searchParams,
        load: loadCanonicalMessagesTimed,
        render: ({ messages, serverQueryMs }) => (
          <MeasuredApp messages={messages} serverQueryMs={serverQueryMs} />
        ),
      })
    case "estimated":
      return loadModePage({
        searchParams,
        load: loadCanonicalMessagesTimed,
        render: ({ messages, serverQueryMs }) => (
          <EstimatedApp messages={messages} serverQueryMs={serverQueryMs} />
        ),
      })
    case "saved-in-browser":
      return loadModePage({
        searchParams,
        load: loadCanonicalMessagesTimed,
        render: ({ messages, serverQueryMs }) => (
          <SavedInBrowserApp messages={messages} serverQueryMs={serverQueryMs} />
        ),
      })
    case "saved-measurements":
      return loadModePage({
        searchParams,
        load: loadSavedMeasurementsPayload,
        render: (payload, { benchmark, simulated }) => (
          <SavedMeasurementsApp
            payload={payload}
            persistMeasurements={!benchmark && !simulated}
          />
        ),
      })
    case "saved-html":
      return loadModePage({
        searchParams,
        load: loadSavedHtmlPayload,
        render: (payload, { benchmark, simulated }) => (
          <SavedHtmlApp
            payload={payload}
            persistMeasurements={!benchmark && !simulated}
          />
        ),
      })
    default: {
      const _exhaustive: never = mode
      throw new Error(`Unhandled conversation mode: ${_exhaustive}`)
    }
  }
}
