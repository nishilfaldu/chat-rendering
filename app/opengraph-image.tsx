import { ImageResponse } from "next/og"

export const alt =
  "Chat rendering experiment showing geometry and HTML reuse across a virtualized conversation"
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
        justifyContent: "space-between",
        background: "#0a0a0a",
        color: "#f5f5f5",
        padding: "72px 80px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          color: "#a3a3a3",
          fontSize: 28,
        }}
      >
        <span style={{ color: "#f5f5f5", fontSize: 31 }}>▲</span>
        Chat rendering
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div
          style={{
            display: "flex",
            maxWidth: 990,
            fontSize: 72,
            fontWeight: 600,
            letterSpacing: "-3px",
            lineHeight: 1.04,
          }}
        >
          What should a virtualized chat remember?
        </div>
        <div
          style={{
            display: "flex",
            maxWidth: 930,
            color: "#a3a3a3",
            fontSize: 29,
            lineHeight: 1.35,
          }}
        >
          Geometry, rendered HTML, and the cost of reusing work across visits.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 16,
          color: "#737373",
          fontSize: 23,
        }}
      >
        <span>10,000 messages</span>
        <span>·</span>
        <span>6 strategies</span>
        <span>·</span>
        <span>live measurements</span>
      </div>
    </div>,
    size
  )
}
