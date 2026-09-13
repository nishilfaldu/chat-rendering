import { ImageResponse } from "next/og"

export const alt =
  "Chat rendering. How to render chat better than just virtualization alone."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 28,
        background: "#0a0a0a",
        color: "#f5f5f5",
        padding: "80px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 78,
          fontWeight: 600,
          letterSpacing: "-3px",
          lineHeight: 1,
        }}
      >
        Chat rendering
      </div>
      <div
        style={{
          display: "flex",
          maxWidth: 980,
          color: "#a3a3a3",
          fontSize: 38,
          lineHeight: 1.3,
        }}
      >
        How to render chat better than just virtualization alone.
      </div>
    </div>,
    size
  )
}
