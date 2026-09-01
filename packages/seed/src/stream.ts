export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const matcher = /\s+|\S+/g;
  let match: RegExpExecArray | null = matcher.exec(text);
  while (match !== null) {
    tokens.push(match[0]);
    match = matcher.exec(text);
  }
  return tokens;
}

export async function replayStream(input: {
  text: string;
  onToken: (soFar: string) => void;
  msPerToken?: number;
  signal?: AbortSignal;
}): Promise<string> {
  const tokens = tokenize(input.text);
  const delay = input.msPerToken ?? 16;
  let soFar = "";
  for (const token of tokens) {
    if (input.signal?.aborted) {
      break;
    }
    soFar += token;
    input.onToken(soFar);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, delay);
    });
  }
  return soFar;
}
