"use client"

import { useEffect, useRef, type MouseEvent } from "react"
import { estimatePx, type HeightClass, type WidthBucket } from "@chat-surface-bench/seed"

export type RailItem = {
  id: string
  heightClass: HeightClass
  measuredPx: number | null
}

export function MessageMapRail({
  items,
  bucket,
  activeId,
  onJump,
}: {
  items: RailItem[]
  bucket: WidthBucket
  activeId?: string
  onJump: (id: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const height = canvas.clientHeight
    const width = canvas.clientWidth
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    const sizes = items.map((item) => item.measuredPx ?? estimatePx(item.heightClass, bucket))
    const total = sizes.reduce((sum, value) => sum + value, 0) || 1
    let y = 0
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const size = sizes[i] ?? 1
      const h = Math.max(0.15, (size / total) * height)
      const measured = item?.measuredPx != null
      ctx.fillStyle = measured ? "oklch(0.488 0.243 264.376)" : "oklch(0.35 0 0)"
      if (item?.id === activeId) {
        ctx.fillStyle = "oklch(0.85 0 0)"
      }
      ctx.fillRect(2, y, width - 4, h)
      y += h
    }
  }, [activeId, bucket, items])

  function handleClick(event: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const t = (event.clientY - rect.top) / rect.height
    const sizes = items.map((item) => item.measuredPx ?? estimatePx(item.heightClass, bucket))
    const total = sizes.reduce((sum, value) => sum + value, 0) || 1
    let acc = 0
    for (let i = 0; i < items.length; i++) {
      acc += (sizes[i] ?? 1) / total
      const item = items[i]
      if (t <= acc && item) {
        onJump(item.id)
        return
      }
    }
  }

  return (
    <aside className="border-border flex w-10 shrink-0 flex-col border-l">
      <p className="text-muted-foreground px-1 py-2 text-center font-mono text-[9px] tracking-wide uppercase">
        map
      </p>
      <canvas ref={canvasRef} className="min-h-0 w-full flex-1 cursor-pointer" onClick={handleClick} />
    </aside>
  )
}
