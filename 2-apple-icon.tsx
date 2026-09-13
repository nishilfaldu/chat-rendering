import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 36,
        background: "#0a0a0a",
      }}
    >
      <div
        style={{
          width: 106,
          height: 82,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 15,
          padding: "0 22px",
          border: "8px solid #f5f5f5",
          borderRadius: 24,
        }}
      >
        <div style={{ display: "flex", height: 8, background: "#f5f5f5" }} />
        <div
          style={{
            display: "flex",
            width: 42,
            height: 8,
            background: "#a3a3a3",
          }}
        />
      </div>
    </div>,
    size
  )
}
