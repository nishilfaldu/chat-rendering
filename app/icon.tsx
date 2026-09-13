import { ImageResponse } from "next/og"

export const size = { width: 64, height: 64 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
      }}
    >
      <div
        style={{
          width: 38,
          height: 30,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 6,
          padding: "0 8px",
          border: "3px solid #f5f5f5",
          borderRadius: 9,
        }}
      >
        <div style={{ display: "flex", height: 3, background: "#f5f5f5" }} />
        <div
          style={{
            display: "flex",
            width: 15,
            height: 3,
            background: "#a3a3a3",
          }}
        />
      </div>
    </div>,
    size
  )
}
