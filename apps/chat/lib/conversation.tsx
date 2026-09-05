import { BaselineApp } from "@/components/modes/baseline-app"
import { HeightClassApp } from "@/components/modes/height-class-app"
import { NaiveApp } from "@/components/modes/naive-app"
import { OrbitCacheApp } from "@/components/modes/orbit-cache-app"
import { ServerHeightsApp } from "@/components/modes/server-heights-app"
import { ServerIndexApp } from "@/components/modes/server-index-app"
import {
  loadServerHeightsPayload,
  loadServerIndexPayload,
} from "@/lib/build-index"
import { loadCanonicalMessagesTimed } from "@/lib/corpus"
import { loadModePage, type ModePageParams } from "@/lib/mode-page"
import type { ChatAppId } from "@workspace/ui/lib/chat-implementations"

export function renderConversation(
  mode: ChatAppId,
  searchParams: ModePageParams
) {
  switch (mode) {
    case "naive":
      return loadModePage({
        searchParams,
        load: loadCanonicalMessagesTimed,
        render: ({ messages, serverQueryMs }) => (
          <NaiveApp messages={messages} serverQueryMs={serverQueryMs} />
        ),
      })
    case "baseline":
      return loadModePage({
        searchParams,
        load: loadCanonicalMessagesTimed,
        render: ({ messages, serverQueryMs }) => (
          <BaselineApp messages={messages} serverQueryMs={serverQueryMs} />
        ),
      })
    case "height-class":
      return loadModePage({
        searchParams,
        load: loadCanonicalMessagesTimed,
        render: ({ messages, serverQueryMs }) => (
          <HeightClassApp messages={messages} serverQueryMs={serverQueryMs} />
        ),
      })
    case "orbit":
      return loadModePage({
        searchParams,
        load: loadCanonicalMessagesTimed,
        render: ({ messages, serverQueryMs }) => (
          <OrbitCacheApp messages={messages} serverQueryMs={serverQueryMs} />
        ),
      })
    case "server-heights":
      return loadModePage({
        searchParams,
        load: loadServerHeightsPayload,
        render: (payload, { benchmark, simulated }) => (
          <ServerHeightsApp
            payload={payload}
            persistMeasurements={!benchmark && !simulated}
          />
        ),
      })
    case "server-index":
      return loadModePage({
        searchParams,
        load: loadServerIndexPayload,
        render: (payload, { benchmark, simulated }) => (
          <ServerIndexApp
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
