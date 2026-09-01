import { CODE_SAMPLES, IMAGE_BOXES, PARAGRAPHS, SHORTS } from "./corpus.ts";
import { predictHeightClass } from "./height-class.ts";
import { intBetween, mulberry32, pick } from "./rng.ts";
import {
  MESSAGE_COUNT,
  SEED,
  SESSION_ID,
  type SeedMessage,
} from "./types.ts";

function messageId(index: number): string {
  return `msg_${String(index).padStart(5, "0")}`;
}

function wrapCode(sample: { lang: string; text: string }, extraLines: number, rng: () => number): string {
  const pad =
    extraLines <= 0
      ? ""
      : `\n${Array.from({ length: extraLines }, (_, i) => `// pad ${intBetween(rng, 1, 9)}${i}`).join("\n")}`;
  return `here is the snippet that actually changes height.\n\n\`\`\`${sample.lang}\n${sample.text}${pad}\n\`\`\`\n`;
}

export function generateMessages(options?: {
  count?: number;
  seed?: number;
  sessionId?: string;
}): SeedMessage[] {
  const count = options?.count ?? MESSAGE_COUNT;
  const seed = options?.seed ?? SEED;
  const sessionId = options?.sessionId ?? SESSION_ID;
  const rng = mulberry32(seed);
  const startedAt = Date.UTC(2026, 2, 15, 18, 0, 0);
  const messages: SeedMessage[] = [];

  for (let i = 0; i < count; i++) {
    const roll = rng();
    const asUser = rng() < 0.42;
    let message: Omit<SeedMessage, "heightClass">;

    if (asUser && roll < 0.72) {
      message = {
        id: messageId(i),
        sessionId,
        role: "user",
        timestamp: startedAt + i * 1373 + intBetween(rng, 0, 400),
        kind: "short",
        text: pick(rng, SHORTS),
        sortIndex: i,
      };
    } else if (roll < 0.12) {
      const box = pick(rng, IMAGE_BOXES);
      message = {
        id: messageId(i),
        sessionId,
        role: asUser ? "user" : "assistant",
        timestamp: startedAt + i * 1373 + intBetween(rng, 0, 400),
        kind: "image",
        text: `screenshot of the ${box.width}x${box.height} panel. reserved box, no network image.`,
        imageWidth: box.width,
        imageHeight: box.height,
        sortIndex: i,
      };
    } else if (roll < 0.38) {
      const sample = pick(rng, CODE_SAMPLES);
      const extra = rng() < 0.35 ? intBetween(rng, 8, 36) : 0;
      message = {
        id: messageId(i),
        sessionId,
        role: "assistant",
        timestamp: startedAt + i * 1373 + intBetween(rng, 0, 400),
        kind: "code",
        text: wrapCode(sample, extra, rng),
        codeLang: sample.lang,
        sortIndex: i,
      };
    } else if (roll < 0.7) {
      const a = pick(rng, PARAGRAPHS);
      const b = rng() < 0.45 ? `\n\n${pick(rng, PARAGRAPHS)}` : "";
      message = {
        id: messageId(i),
        sessionId,
        role: asUser ? "user" : "assistant",
        timestamp: startedAt + i * 1373 + intBetween(rng, 0, 400),
        kind: "paragraph",
        text: `${a}${b}`,
        sortIndex: i,
      };
    } else {
      message = {
        id: messageId(i),
        sessionId,
        role: asUser ? "user" : "assistant",
        timestamp: startedAt + i * 1373 + intBetween(rng, 0, 400),
        kind: "short",
        text: pick(rng, SHORTS),
        sortIndex: i,
      };
    }

    messages.push({
      ...message,
      heightClass: predictHeightClass(message),
    });
  }

  return messages;
}
