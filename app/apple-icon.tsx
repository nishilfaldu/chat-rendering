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
      <span style={{ color: "#f5f5f5", fontSize: 88 }}>▲</span>
    </div>,
    size
  )
}
