export type CacheLabel = "cold" | "warm" | "n/a";

export type BenchSnapshot = {
  appId: string;
  cache: CacheLabel;
  messageCount: number;
  firstPaintMs: number | null;
  scrollFps: number | null;
  jumpN: number | null;
  jumpMs: number | null;
  domNodes: number | null;
  takenAt: number;
};
