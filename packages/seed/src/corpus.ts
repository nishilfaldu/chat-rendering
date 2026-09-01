export const SHORTS = [
  "did that land?",
  "show me the failing test.",
  "ok, ship the smaller patch first.",
  "what changed in the last 20 minutes?",
  "this still jumps when I scroll up.",
  "keep the estimate flat. no cleverness.",
  "can we jump to message 8000 without hitching?",
  "the code block is the thing that blows the height.",
  "warm cache this time. I already scrolled it once.",
  "leave the naive app alone. it is supposed to hurt.",
] as const;

export const PARAGRAPHS = [
  "Chat lists look like feeds until the last row starts growing. Every token adds pixels at the end, and if the virtualizer is start-anchored the viewport slowly walks away from the thing you were reading. The naive fix is to pin scrollTop on every frame. That works until the user peeks at history, at which point you have invented a fight between follow-mode and their thumb.",
  "Markdown is not a row height. A short sentence and a fenced TypeScript file share a message id and nothing else. Syntax highlighters make it worse because the first paint is a placeholder, the second paint is parsed markdown, and the third paint is tokens. If you persist the first number you will spend the next session apologizing to the scrollbar.",
  "IndexedDB is the right home for heights only if you wait until the row is actually done. Orbit's 500ms quiet window exists because Shiki does not finish in order. Snapshot too early and you store the pre-highlight height forever. Snapshot too late and revisit still costs a live render. The window is a product decision, not a library default.",
  "A server can guess a height class from char count, fence count, and known image boxes. That guess is wrong in pixels and right in shape. The minimap can draw on first paint from the index, then tighten as real measurements come back keyed by viewport width. Cold means the guess. Warm means the tape measure.",
  "Scroll FPS is the number people feel. First paint is the number people wait for. Jump-to-N is the number that exposes a lying estimateSize. If those three disagree, believe jump-to-N. It is the one that walks the prefix sum and finds out whether your cache was a wish.",
] as const;

export const CODE_SAMPLES: ReadonlyArray<{ lang: string; text: string }> = [
  {
    lang: "ts",
    text: `export function widthBucket(px: number): 400 | 800 | 1440 {
  if (px < 600) return 400
  if (px < 1120) return 800
  return 1440
}

export function estimateSize(kind: 'xs' | 'sm' | 'md' | 'lg' | 'xl'): number {
  switch (kind) {
    case 'xs':
      return 52
    case 'sm':
      return 80
    case 'md':
      return 140
    case 'lg':
      return 260
    case 'xl':
      return 420
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}`,
  },
  {
    lang: "tsx",
    text: `const virtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 72,
  getItemKey: (index) => messages[index]!.id,
})

return (
  <div ref={parentRef} className="h-full overflow-auto">
    <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
      {virtualizer.getVirtualItems().map((item) => (
        <div
          key={item.key}
          data-index={item.index}
          ref={virtualizer.measureElement}
          style={{
            position: 'absolute',
            top: 0,
            width: '100%',
            transform: \`translateY(\${item.start}px)\`,
          }}
        >
          <MessageBubble message={messages[item.index]!} />
        </div>
      ))}
    </div>
  </div>
)`,
  },
  {
    lang: "python",
    text: `def djb2(text: str) -> int:
    h = 5381
    for ch in text:
        h = ((h << 5) + h + ord(ch)) & 0xFFFFFFFF
    return h


def settle(last_measure_at: dict[str, float], now: float, window_ms: float = 500) -> set[str]:
    settled = set()
    for key, ts in last_measure_at.items():
        if now - ts >= window_ms:
            settled.add(key)
    return settled`,
  },
  {
    lang: "sql",
    text: `CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  height_class TEXT NOT NULL,
  sort_index INTEGER NOT NULL
);

CREATE INDEX messages_session_sort ON messages(session_id, sort_index);

SELECT m.id, m.timestamp, m.height_class, h.px AS measured_px
FROM messages m
LEFT JOIN height_measurements h
  ON h.message_id = m.id AND h.width_bucket = :bucket
ORDER BY m.sort_index;`,
  },
  {
    lang: "rust",
    text: `fn measure_element(entry: Option<ResizeObserverEntry>, cached: Option<f64>, dom: f64) -> f64 {
    match entry {
        None => cached.filter(|v| *v > 0.0).unwrap_or(dom),
        Some(_) => dom,
    }
}`,
  },
  {
    lang: "go",
    text: `func replay(text string, emit func(string)) {
    start := 0
    for i, r := range text {
        if r == ' ' || r == '\\n' {
            emit(text[start : i+1])
            start = i + 1
        }
    }
    if start < len(text) {
        emit(text[start:])
    }
}`,
  },
  {
    lang: "bash",
    text: `pnpm seed
pnpm --filter naive dev --port 3001
pnpm --filter baseline dev --port 3002
pnpm --filter orbit-style dev --port 3003
pnpm --filter server-index dev --port 3004`,
  },
  {
    lang: "json",
    text: `{
  "app": "orbit-style",
  "cache": "warm",
  "firstPaintMs": 184,
  "scrollFps": 56.2,
  "jumpTo": { "n": 8000, "ms": 12.4 },
  "domNodes": 186
}`,
  },
];

export const IMAGE_BOXES: ReadonlyArray<{ width: number; height: number }> = [
  { width: 1280, height: 720 },
  { width: 800, height: 800 },
  { width: 640, height: 360 },
  { width: 1024, height: 256 },
  { width: 512, height: 768 },
];
