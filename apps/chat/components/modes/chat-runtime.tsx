"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { MESSAGE_COUNT, replayStream } from "@chat-surface-bench/seed"
import type { WidthBucket } from "@chat-surface-bench/seed"
import {
  convergeVirtualJump,
  timeJump,
  useBench,
  useBenchSession,
} from "@chat-surface-bench/bench"
import { ChatColumn } from "@workspace/ui/components/chat-column"
import { ChatFrame } from "@workspace/ui/components/chat-frame"
import { useStickToBottom } from "@workspace/ui/hooks/use-stick-to-bottom"

import { useWidthBucket } from "./geometry-hooks"

export type ChatRuntimeController = {
  kind: "natural" | "virtual"
  scrollToIndex: (rowIndex: number, align: "start" | "end") => void
  prepareJump?: (rowIndex: number) => Promise<void>
}

type RuntimeRegistration = {
  controller: ChatRuntimeController | null
  ready: boolean
}

type ChatRuntimeContextValue = {
  scrollElement: HTMLDivElement | null
  widthBucket: WidthBucket
  streaming: { id: string; text: string } | null
  jump: (rowIndex: number) => Promise<void>
  scrollToOffset: (offset: number) => void
  adjustScrollBy: (delta: number) => void
  register: (registration: RuntimeRegistration) => void
  registerBeforeWidthChange: (callback: (() => void) | null) => void
}

const ChatRuntimeContext = createContext<ChatRuntimeContextValue | null>(null)

export function useChatRuntime(): Omit<
  ChatRuntimeContextValue,
  "register" | "registerBeforeWidthChange"
> {
  const context = useContext(ChatRuntimeContext)
  if (!context) throw new Error("useChatRuntime must be used by ChatRuntime")
  return {
    scrollElement: context.scrollElement,
    widthBucket: context.widthBucket,
    streaming: context.streaming,
    jump: context.jump,
    scrollToOffset: context.scrollToOffset,
    adjustScrollBy: context.adjustScrollBy,
  }
}

export function useBeforeWidthChange(callback: () => void): void {
  const context = useContext(ChatRuntimeContext)
  if (!context)
    throw new Error("useBeforeWidthChange must be used by ChatRuntime")
  const register = context.registerBeforeWidthChange
  useLayoutEffect(() => {
    register(callback)
    return () => register(null)
  }, [callback, register])
}

export function useChatRuntimeController(
  controller: ChatRuntimeController,
  ready = true
): void {
  const context = useContext(ChatRuntimeContext)
  if (!context) {
    throw new Error("useChatRuntimeController must be used by ChatRuntime")
  }
  const register = context.register
  useLayoutEffect(() => {
    register({ controller, ready })
    return () => register({ controller: null, ready: false })
  }, [controller, ready, register])
}

export function ChatRuntime({
  lastMessage,
  onCacheReset,
  children,
}: {
  lastMessage: { id: string; text: string } | null
  onCacheReset?: () => void | Promise<void>
  children: ReactNode
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null
  )
  const [streaming, setStreaming] = useState<{
    id: string
    text: string
  } | null>(null)
  const [surfaceReady, setSurfaceReady] = useState(false)
  const controllerRef = useRef<ChatRuntimeController | null>(null)
  const beforeWidthChangeRef = useRef<(() => void) | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const initialized = useRef(false)
  const readyRef = useRef(false)
  const { markFirstPaint, recordJump, registerCommands } = useBench()
  const { pinAndStick, stickIfPinned, release } =
    useStickToBottom(scrollElement)
  const lastIndex = MESSAGE_COUNT - 1
  const width = useWidthBucket(scrollElement, () => {
    beforeWidthChangeRef.current?.()
  })

  useLayoutEffect(() => {
    setScrollElement(scrollRef.current)
  }, [])

  useEffect(
    () => () => {
      abortRef.current?.abort()
    },
    []
  )

  useBenchSession({
    root: scrollElement,
    scroll: scrollElement,
    messageCount: MESSAGE_COUNT,
  })

  const register = useCallback((registration: RuntimeRegistration) => {
    controllerRef.current = registration.controller
    if (readyRef.current !== registration.ready) {
      readyRef.current = registration.ready
      setSurfaceReady(registration.ready)
    }
  }, [])

  const registerBeforeWidthChange = useCallback(
    (callback: (() => void) | null) => {
      beforeWidthChangeRef.current = callback
    },
    []
  )
  const scrollToOffset = useCallback((offset: number) => {
    if (scrollRef.current) scrollRef.current.scrollTop = offset
  }, [])
  const adjustScrollBy = useCallback((delta: number) => {
    if (scrollRef.current) scrollRef.current.scrollTop += delta
  }, [])

  useLayoutEffect(() => {
    if (!surfaceReady || initialized.current || !scrollElement) return
    initialized.current = true
    controllerRef.current?.scrollToIndex(lastIndex, "end")
    pinAndStick()
    const frame = requestAnimationFrame(() => markFirstPaint())
    return () => cancelAnimationFrame(frame)
  }, [lastIndex, markFirstPaint, pinAndStick, scrollElement, surfaceReady])

  useEffect(() => {
    if (!scrollElement) return
    const list = scrollElement.querySelector<HTMLElement>("[data-chat-list]")
    if (!list) return
    const observer = new ResizeObserver(() => stickIfPinned())
    observer.observe(list)
    return () => observer.disconnect()
  }, [scrollElement, stickIfPinned, surfaceReady])

  const jump = useCallback(
    async (requested: number) => {
      const controller = controllerRef.current
      if (!controller || !scrollElement) return
      const rowIndex = Math.min(Math.max(requested, 0), lastIndex)
      const align = rowIndex === lastIndex ? "end" : "start"
      release()
      const ms = await timeJump(async () => {
        await controller.prepareJump?.(rowIndex)
        if (controller.kind === "virtual") {
          await convergeVirtualJump({
            scrollElement,
            rowIndex,
            align,
            scroll: () => controller.scrollToIndex(rowIndex, align),
          })
        } else {
          controller.scrollToIndex(rowIndex, align)
        }
      })
      recordJump(ms)
    },
    [lastIndex, recordJump, release, scrollElement]
  )

  const streamLast = useCallback(async () => {
    const last = lastMessage
    const controller = controllerRef.current
    if (!last || !controller) return
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort
    pinAndStick()
    controller.scrollToIndex(lastIndex, "end")
    setStreaming({ id: last.id, text: "" })
    await replayStream({
      text: last.text,
      signal: abort.signal,
      onToken: (text) => {
        setStreaming({ id: last.id, text })
        requestAnimationFrame(() => {
          stickIfPinned()
        })
      },
    })
    if (!abort.signal.aborted) {
      setStreaming(null)
      stickIfPinned()
    }
  }, [lastIndex, lastMessage, pinAndStick, stickIfPinned])

  useLayoutEffect(() => {
    if (streaming) stickIfPinned()
  }, [streaming, stickIfPinned])

  const resetCache = useCallback(async () => {
    await onCacheReset?.()
  }, [onCacheReset])

  const stopStream = useCallback(() => {
    abortRef.current?.abort()
    setStreaming(null)
  }, [])

  useEffect(() => {
    registerCommands({ jump, streamLast, stopStream, resetCache })
    return () => registerCommands(null)
  }, [jump, registerCommands, resetCache, streamLast, stopStream])

  const context = useMemo<ChatRuntimeContextValue>(
    () => ({
      scrollElement,
      widthBucket: width,
      streaming,
      jump,
      scrollToOffset,
      adjustScrollBy,
      register,
      registerBeforeWidthChange,
    }),
    [
      adjustScrollBy,
      jump,
      register,
      registerBeforeWidthChange,
      scrollElement,
      scrollToOffset,
      streaming,
      width,
    ]
  )

  return (
    <ChatRuntimeContext.Provider value={context}>
      <ChatFrame>
        <ChatColumn scrollRef={scrollRef}>{children}</ChatColumn>
      </ChatFrame>
    </ChatRuntimeContext.Provider>
  )
}
