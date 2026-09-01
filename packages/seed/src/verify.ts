import { generateMessages, hashContent, MESSAGE_COUNT } from "./index.ts";

const a = generateMessages();
const b = generateMessages();
if (a.length !== MESSAGE_COUNT || b.length !== MESSAGE_COUNT) {
  throw new Error(`expected ${MESSAGE_COUNT}, got ${a.length}/${b.length}`);
}
const ha = hashContent(a.map((m) => `${m.id}:${m.kind}:${m.text.length}:${m.heightClass}`).join("|"));
const hb = hashContent(b.map((m) => `${m.id}:${m.kind}:${m.text.length}:${m.heightClass}`).join("|"));
if (ha !== hb) {
  throw new Error("generator is not deterministic");
}
const kinds = { short: 0, paragraph: 0, code: 0, image: 0 };
for (const message of a) {
  kinds[message.kind] += 1;
}
console.log(
  JSON.stringify(
    {
      count: a.length,
      hash: ha,
      first: a[0]?.id,
      last: a[MESSAGE_COUNT - 1]?.id,
      kinds,
    },
    null,
    2,
  ),
);
