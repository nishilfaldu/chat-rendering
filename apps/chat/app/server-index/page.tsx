import { ServerIndexApp } from "@/components/modes/server-index-app"
import { loadServerIndexPayload } from "@/lib/build-index"

export const dynamic = "force-dynamic"

export default function Page() {
  const payload = loadServerIndexPayload()
  return <ServerIndexApp payload={payload} />
}
