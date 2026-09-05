import { NextRequest, NextResponse } from "next/server"
import { getPrerenderedHtmlBatch } from "@/lib/seed/db"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const raw = request.nextUrl.searchParams.get("ids") ?? ""
  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
  if (ids.length === 0) {
    return NextResponse.json({ html: {} })
  }
  if (ids.length > 80) {
    return NextResponse.json({ error: "too many ids" }, { status: 400 })
  }
  const html: Record<string, string> = {}
  for (const [id, row] of getPrerenderedHtmlBatch(ids)) {
    if (row) html[id] = row
  }
  return NextResponse.json({ html })
}
