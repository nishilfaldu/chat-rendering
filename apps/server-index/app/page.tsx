import { ServerIndexApp } from "@/components/server-index-app"
import { buildServerIndex } from "@/lib/build-index"

export default function Page() {
  const index = buildServerIndex()
  return (
    <div className="h-svh overflow-hidden">
      <ServerIndexApp index={index} />
    </div>
  )
}
