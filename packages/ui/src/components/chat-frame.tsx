"use client"

import type { FormEvent, ReactNode } from "react"
import Link from "next/link"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Separator } from "@workspace/ui/components/separator"

export const APP_LINKS = [
  { id: "naive", href: "/naive", label: "naive" },
  { id: "baseline", href: "/baseline", label: "baseline" },
  { id: "orbit-style", href: "/orbit-style", label: "orbit-style" },
  { id: "server-index", href: "/server-index", label: "server-index" },
] as const

export type CacheLabel = "cold" | "warm" | "n/a"

export function ChatFrame({
  appId,
  title,
  implementsList,
  doesNotList,
  cacheLabel,
  onCacheReset,
  onJumpTo,
  onStreamLast,
  hud,
  rail,
  children,
}: {
  appId: (typeof APP_LINKS)[number]["id"]
  title: string
  implementsList: string[]
  doesNotList: string[]
  cacheLabel: CacheLabel
  onCacheReset?: () => void
  onJumpTo: (n: number) => void
  onStreamLast: () => void
  hud: ReactNode
  rail?: ReactNode
  children: ReactNode
}) {
  function handleJump(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const raw = String(data.get("n") ?? "")
    const n = Number.parseInt(raw, 10)
    if (Number.isFinite(n)) {
      onJumpTo(n)
    }
  }

  return (
    <div className="bg-background relative flex h-full min-h-0 flex-col">
      <header className="border-border shrink-0 border-b px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.18em] uppercase">
              chat-surface-bench
            </p>
            <h1 className="text-lg font-medium">{title}</h1>
          </div>
          <nav className="flex flex-wrap gap-1">
            {APP_LINKS.map((app) => (
              <Link
                key={app.id}
                href={app.href}
                className={
                  app.id === appId
                    ? "bg-secondary rounded-md px-2 py-1 font-mono text-xs"
                    : "text-muted-foreground hover:bg-accent rounded-md px-2 py-1 font-mono text-xs"
                }
              >
                {app.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={cacheLabel === "cold" ? "destructive" : cacheLabel === "warm" ? "default" : "outline"}>
            cache {cacheLabel}
          </Badge>
          <form className="flex items-center gap-1" onSubmit={handleJump}>
            <Input name="n" defaultValue="8000" className="w-20" aria-label="jump to message n" />
            <Button type="submit" variant="secondary" size="sm">
              jump
            </Button>
          </form>
          <Button type="button" variant="outline" size="sm" onClick={onStreamLast}>
            replay stream
          </Button>
          {onCacheReset ? (
            <Button type="button" variant="ghost" size="sm" onClick={onCacheReset}>
              reset caches
            </Button>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-2 max-w-4xl text-xs leading-5">
          does: {implementsList.join(" · ")}
          <span className="text-border mx-2">|</span>
          does not: {doesNotList.join(" · ")}
        </p>
        {hud}
      </header>
      <Separator />
      <div className="flex min-h-0 flex-1">
        <div className="relative min-h-0 min-w-0 flex-1">{children}</div>
        {rail}
      </div>
    </div>
  )
}
