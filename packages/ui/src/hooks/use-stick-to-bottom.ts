"use client"

import { useCallback, useEffect, useRef } from "react"

const PIN_PX = 80

export function useStickToBottom(scrollEl: HTMLElement | null): {
  pinAndStick: () => void
  stickIfPinned: () => void
  release: () => void
} {
  const pinnedRef = useRef(true)

  useEffect(() => {
    if (!scrollEl) return
    const onScroll = () => {
      const gap = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight
      pinnedRef.current = gap <= PIN_PX
    }
    scrollEl.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      scrollEl.removeEventListener("scroll", onScroll)
    }
  }, [scrollEl])

  const stickIfPinned = useCallback(() => {
    if (!scrollEl || !pinnedRef.current) return
    scrollEl.scrollTop = scrollEl.scrollHeight
  }, [scrollEl])

  const pinAndStick = useCallback(() => {
    pinnedRef.current = true
    if (!scrollEl) return
    scrollEl.scrollTop = scrollEl.scrollHeight
  }, [scrollEl])

  const release = useCallback(() => {
    pinnedRef.current = false
  }, [])

  return { pinAndStick, stickIfPinned, release }
}
