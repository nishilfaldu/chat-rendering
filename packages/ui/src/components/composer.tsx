"use client"

import type { FormEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

export function Composer({
  disabled,
  onSend,
}: {
  disabled?: boolean
  onSend: (text: string) => void
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const text = String(data.get("text") ?? "").trim()
    if (text.length === 0) return
    onSend(text)
    event.currentTarget.reset()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border bg-background flex shrink-0 items-center gap-2 border-t px-4 py-3"
    >
      <Input name="text" placeholder="type, then ignore it. this bench is about the list." disabled={disabled} />
      <Button type="submit" disabled={disabled}>
        send
      </Button>
    </form>
  )
}
