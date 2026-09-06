/** Samples the same message relative to its viewport, without counting user scrolling. */
export function trackReadingPosition(scroll: HTMLElement, streaming = false) {
  const win = scroll.ownerDocument.defaultView!
  let anchor: { id: string; top: number; element: HTMLElement } | null = null
  let peak: number | null = null
  let shift: number | null = null
  let lost = false
  let interrupted = false
  let pointerDown = false
  let pauseUntil = 0
  let raf = 0
  let finished: { shift: number | null; peak: number | null } | undefined

  const capture = () => {
    const viewport = scroll.getBoundingClientRect()
    const row = [
      ...scroll.querySelectorAll<HTMLElement>("[data-message-id]"),
    ].find((row) => {
      const rect = row.getBoundingClientRect()
      return rect.bottom > viewport.top + 1 && rect.top < viewport.bottom
    })
    return row
      ? {
          id: row.dataset.messageId!,
          element: row,
          top: row.getBoundingClientRect().top - viewport.top,
        }
      : null
  }
  if (!streaming) anchor = capture()
  const input = () => {
    anchor = null
    pauseUntil = win.performance.now() + 160
    if (!streaming) interrupted = true
  }
  const down = () => {
    pointerDown = true
    input()
  }
  const up = () => {
    pointerDown = false
    input()
  }
  const key = (event: KeyboardEvent) => {
    if (
      [
        "ArrowUp",
        "ArrowDown",
        "PageUp",
        "PageDown",
        "Home",
        "End",
        " ",
      ].includes(event.key)
    )
      input()
  }
  const onScroll = () => {
    if (pointerDown || win.performance.now() < pauseUntil)
      pauseUntil = win.performance.now() + 160
  }
  scroll.addEventListener("wheel", input, { passive: true })
  scroll.addEventListener("touchmove", input, { passive: true })
  scroll.addEventListener("pointerdown", down, { passive: true })
  win.addEventListener("pointerup", up)
  win.addEventListener("pointercancel", up)
  scroll.addEventListener("keydown", key)
  scroll.addEventListener("scroll", onScroll, { passive: true })

  const sample = () => {
    if (interrupted || pointerDown || win.performance.now() < pauseUntil) return
    if (!anchor) {
      // Following the growing response is intentional movement, not reading drift.
      if (
        !streaming ||
        scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight <= 64
      )
        return
      anchor = capture()
      return
    }
    const row = anchor.element.isConnected
      ? anchor.element
      : scroll.querySelector<HTMLElement>(`[data-message-id="${anchor.id}"]`)
    if (!row) {
      lost = true
      shift = null
      return
    }
    anchor.element = row
    shift = Math.abs(
      row.getBoundingClientRect().top -
        scroll.getBoundingClientRect().top -
        anchor.top
    )
    peak = Math.max(peak ?? 0, shift)
  }
  const tick = () => {
    sample()
    raf = win.requestAnimationFrame(tick)
  }
  raf = win.requestAnimationFrame(tick)
  return () => {
    if (finished) return finished
    win.cancelAnimationFrame(raf)
    sample()
    scroll.removeEventListener("wheel", input)
    scroll.removeEventListener("touchmove", input)
    scroll.removeEventListener("pointerdown", down)
    win.removeEventListener("pointerup", up)
    win.removeEventListener("pointercancel", up)
    scroll.removeEventListener("keydown", key)
    scroll.removeEventListener("scroll", onScroll)
    finished = {
      shift: interrupted ? null : shift,
      peak: interrupted || lost ? null : peak,
    }
    return finished
  }
}
