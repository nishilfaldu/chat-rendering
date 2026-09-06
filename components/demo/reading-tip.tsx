"use client"

import { useId, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

export function ReadingTip({
  tip,
  children,
}: {
  tip: string
  children: ReactNode
}) {
  const id = useId()
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  return (
    <>
      <span
        className="bench-tip"
        tabIndex={0}
        aria-describedby={anchor ? id : undefined}
        onKeyDown={(event) => {
          if (event.key === "Escape") setAnchor(null)
        }}
        onPointerEnter={(event) =>
          setAnchor(event.currentTarget.getBoundingClientRect())
        }
        onPointerLeave={() => setAnchor(null)}
        onFocus={(event) =>
          setAnchor(event.currentTarget.getBoundingClientRect())
        }
        onBlur={() => setAnchor(null)}
      >
        {children}
      </span>
      {anchor
        ? createPortal(
            <span
              className="bench-tip-bubble"
              role="tooltip"
              id={id}
              style={{
                left: Math.min(anchor.left, window.innerWidth - 236),
                top: anchor.top,
              }}
            >
              {tip}
            </span>,
            document.body
          )
        : null}
    </>
  )
}
