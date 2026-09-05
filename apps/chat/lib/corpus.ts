import {
  MESSAGE_COUNT,
  SESSION_ID,
  type SeedMessage,
} from "@chat-surface-bench/seed"
import { listMessages, messageCount } from "@chat-surface-bench/seed/db"

export function loadCanonicalMessages(): SeedMessage[] {
  const allCount = messageCount()
  if (allCount !== MESSAGE_COUNT) {
    throw new Error(
      `seed sqlite has ${allCount} messages; expected ${MESSAGE_COUNT} — run pnpm seed`
    )
  }
  return listMessages(SESSION_ID)
}

export function loadCanonicalMessagesTimed(): {
  messages: SeedMessage[]
  serverQueryMs: number
} {
  const started = performance.now()
  const messages = loadCanonicalMessages()
  return { messages, serverQueryMs: performance.now() - started }
}
