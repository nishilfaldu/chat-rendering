import { readFile } from "node:fs/promises"
import path from "node:path"
import { workspaceRoot } from "@/lib/seed/browser-harness"

export async function GET() {
  try {
    const body = await readFile(
      path.join(workspaceRoot(), "benchmarks/results/raw.json"),
      "utf8"
    )
    return new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition":
          'attachment; filename="chat-rendering-results.json"',
        "Cache-Control": "no-store",
      },
    })
  } catch {
    return Response.json(
      { error: "No benchmark results are available yet." },
      { status: 404 }
    )
  }
}
