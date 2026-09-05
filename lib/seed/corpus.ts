export const SHORTS = [
  "Can you show the relevant code?",
  "What happens when the window gets narrower?",
  "That works. Let's check a longer conversation.",
  "Can we keep the same message in view?",
  "The reading position changes when I scroll up.",
  "How much of the history is mounted right now?",
  "Can we jump directly to message 8,000?",
  "The code block makes this message much taller.",
  "Try reopening the conversation with the saved measurements.",
  "Let's compare this with rendering every message.",
] as const

export const PARAGRAPHS = [
  "A conversation can change while someone is reading it. New text should stay in view when the reader is following the latest response. Once they scroll into history, incoming tokens should leave their reading position alone.",
  "Message height depends on the content and the available width. Paragraphs wrap, code blocks have different line counts, and images take up space. A measurement is useful only when it describes the layout we are actually rendering.",
  "The browser can save measurements for a later visit. That avoids repeating some work, but a first visit still needs estimates. We should compare both cases and record how much of the conversation the browser has already seen.",
  "Server measurements are shared across visits. The client still checks the real content because a font, layout change, or edited message can invalidate a saved height. Missing measurements should fall back to estimates and recover as content appears.",
  "We should measure arrival time and reading-position stability separately. A message can appear quickly and move afterward. Frame intervals, visible content, and retained memory help explain the rest of the interaction.",
] as const

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
          <MessageBubble
            message={messages[item.index]!}
            content={{
              kind: 'markdown',
              markdown: messages[item.index]!.text,
            }}
          />
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
]

export const IMAGE_BOXES: ReadonlyArray<{ width: number; height: number }> = [
  { width: 1280, height: 720 },
  { width: 800, height: 800 },
  { width: 640, height: 360 },
  { width: 1024, height: 256 },
  { width: 512, height: 768 },
]
