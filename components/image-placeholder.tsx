export function ImagePlaceholder({
  width,
  height,
}: {
  width: number
  height: number
}) {
  return (
    <div
      className="csb-image"
      style={{ aspectRatio: `${width}/${height}` }}
      data-w={width}
      data-h={height}
    >
      <span>
        {width}×{height}
      </span>
    </div>
  )
}
