"use client"

import { useCallback, useEffect, useLayoutEffect, useRef } from "react"

export const CHAT_PIN_THRESHOLD_PX = 80

export function useStickToBottom(scrollEl: HTMLElement | null): {
  pinAndStick: () => void
  stickIfPinned: () => void
  release: () => void
} {
  const pinnedRef = useRef(true)
  const scrollRef = useRef(scrollEl)
  useLayoutEffect(() => {
    scrollRef.current = scrollEl
  }, [scrollEl])

  useEffect(() => {
    if (!scrollEl) return
    const onScroll = () => {
      const gap =
        scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight
      pinnedRef.current = gap <= CHAT_PIN_THRESHOLD_PX
    }
    scrollEl.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      scrollEl.removeEventListener("scroll", onScroll)
    }
  }, [scrollEl])

  useEffect(() => {
    if (!scrollEl) return
    const content = scrollEl.querySelector<HTMLElement>("[data-chat-content]")
    if (!content) return
    const observer = new ResizeObserver(() => {
      if (!pinnedRef.current) return
      scrollEl.scrollTop = scrollEl.scrollHeight
    })
    observer.observe(content)
    return () => observer.disconnect()
  }, [scrollEl])

  const stickIfPinned = useCallback(() => {
    const element = scrollRef.current
    if (!element || !pinnedRef.current) return
    element.scrollTop = element.scrollHeight
  }, [])

  const pinAndStick = useCallback(() => {
    pinnedRef.current = true
    const element = scrollRef.current
    if (!element) return
    element.scrollTop = element.scrollHeight
  }, [])

  const release = useCallback(() => {
    pinnedRef.current = false
  }, [])

  return { pinAndStick, stickIfPinned, release }
}
