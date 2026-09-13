import { CODE_SAMPLES, IMAGE_BOXES, PARAGRAPHS, SHORTS } from "./corpus.ts"
import { predictHeightClass } from "./height-class.ts"
import { intBetween, mulberry32, pick } from "./rng.ts"
import { MESSAGE_COUNT, SEED, SESSION_ID, type SeedMessage } from "./types.ts"

function messageId(index: number): string {
  return `msg_${String(index).padStart(5, "0")}`
}

function wrapCode(
  sample: { lang: string; text: string },
  extraLines: number,
  rng: () => number
): string {
  const pad =
    extraLines <= 0
      ? ""
      : `\n${Array.from({ length: extraLines }, (_, i) => `// fixture row ${i}: value ${intBetween(rng, 1, 9)}`).join("\n")}`
  return `Here is the function I would start with.\n\n\`\`\`${sample.lang}\n${sample.text}${pad}\n\`\`\`\n`
}

export function generateMessages(): SeedMessage[] {
  const rng = mulberry32(SEED)
  const startedAt = Date.UTC(2026, 2, 15, 18, 0, 0)
  const messages: SeedMessage[] = []

  for (let i = 0; i < MESSAGE_COUNT; i++) {
    const roll = rng()
    const asUser = rng() < 0.42
    let message: Omit<SeedMessage, "heightClass">

    if (i === MESSAGE_COUNT - 1) {
      message = {
        id: messageId(i),
        sessionId: SESSION_ID,
        role: "assistant",
        timestamp: startedAt + i * 1373 + intBetween(rng, 0, 400),
        kind: "code",
        text: "Here is the follow helper that only moves when the reader is already at the bottom:\n\n```ts\nfunction followIfPinned() {\n  if (!pinned.current) return\n  viewport.scrollTop = viewport.scrollHeight\n}\n```\n\nIf you have scrolled into older jobs, incoming lines should leave that row where it is.",
        codeLang: "ts",
        sortIndex: i,
      }
    } else if (roll < 0.07) {
      const box = pick(rng, IMAGE_BOXES)
      message = {
        id: messageId(i),
        sessionId: SESSION_ID,
        role: asUser ? "user" : "assistant",
        timestamp: startedAt + i * 1373 + intBetween(rng, 0, 400),
        kind: "image",
        text: `Screenshot ${box.width} × ${box.height}, captured from the staging dashboard.`,
        imageWidth: box.width,
        imageHeight: box.height,
        sortIndex: i,
      }
    } else if (roll < 0.22) {
      const sample = pick(rng, CODE_SAMPLES)
      const extra = rng() < 0.35 ? intBetween(rng, 8, 36) : 0
      message = {
        id: messageId(i),
        sessionId: SESSION_ID,
        role: asUser ? "user" : "assistant",
        timestamp: startedAt + i * 1373 + intBetween(rng, 0, 400),
        kind: "code",
        text: wrapCode(sample, extra, rng),
        codeLang: "ts",
        sortIndex: i,
      }
    } else if (roll < 0.4) {
      const a = pick(rng, PARAGRAPHS)
      const b = rng() < 0.45 ? `\n\n${pick(rng, PARAGRAPHS)}` : ""
      message = {
        id: messageId(i),
        sessionId: SESSION_ID,
        role: asUser ? "user" : "assistant",
        timestamp: startedAt + i * 1373 + intBetween(rng, 0, 400),
        kind: "paragraph",
        text: `${a}${b}`,
        sortIndex: i,
      }
    } else {
      message = {
        id: messageId(i),
        sessionId: SESSION_ID,
        role: asUser ? "user" : "assistant",
        timestamp: startedAt + i * 1373 + intBetween(rng, 0, 400),
        kind: "short",
        text: pick(rng, SHORTS),
        sortIndex: i,
      }
    }

    messages.push({
      ...message,
      heightClass: predictHeightClass(message),
    })
  }

  return messages
}
