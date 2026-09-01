import { ServerIndexApp } from "@/components/modes/server-index-app"
import { buildServerIndex } from "@/lib/build-index"

export default function Page() {
  const index = buildServerIndex()
  return <ServerIndexApp index={index} />
}
