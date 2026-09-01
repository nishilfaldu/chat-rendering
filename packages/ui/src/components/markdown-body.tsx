"use client"

import { splitMarkdown, textToHtml } from "@chat-surface-bench/seed"

import { CodeBlock } from "@workspace/ui/components/code-block"
import { ImagePlaceholder } from "@workspace/ui/components/image-placeholder"

export function MarkdownBody({
  text,
  streaming,
  imageWidth,
  imageHeight,
}: {
  text: string
  streaming?: boolean
  imageWidth?: number
  imageHeight?: number
}) {
  const blocks = splitMarkdown(text)
  return (
    <div className="csb-md text-sm leading-6">
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return <CodeBlock key={`code-${index}`} code={block.code} lang={block.lang} streaming={streaming} />
        }
        return <div key={`text-${index}`} dangerouslySetInnerHTML={{ __html: textToHtml(block.text) }} />
      })}
      {imageWidth !== undefined && imageHeight !== undefined ? (
        <ImagePlaceholder width={imageWidth} height={imageHeight} />
      ) : null}
    </div>
  )
}
