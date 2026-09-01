export function hashContent(text: string): number {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

export type MarkdownBlock =
  | { type: "text"; text: string }
  | { type: "code"; lang: string; code: string };

export function splitMarkdown(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const fence = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null = fence.exec(text);
  while (match !== null) {
    const before = text.slice(last, match.index).trim();
    if (before.length > 0) {
      blocks.push({ type: "text", text: before });
    }
    blocks.push({
      type: "code",
      lang: match[1] && match[1].length > 0 ? match[1] : "txt",
      code: (match[2] ?? "").replace(/\n$/, ""),
    });
    last = match.index + match[0].length;
    match = fence.exec(text);
  }
  const rest = text.slice(last).trim();
  if (rest.length > 0) {
    blocks.push({ type: "text", text: rest });
  }
  if (blocks.length === 0) {
    blocks.push({ type: "text", text });
  }
  return blocks;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replaceAll("\n", "<br />")}</p>`)
    .join("");
}
