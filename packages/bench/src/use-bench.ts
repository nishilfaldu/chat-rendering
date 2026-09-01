"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { BenchSnapshot, CacheLabel } from "./types.ts";

type BenchApi = {
  snapshot: BenchSnapshot;
  setCache: (cache: CacheLabel) => void;
  setMessageCount: (count: number) => void;
  markFirstPaint: () => void;
  setScrollFps: (fps: number | null) => void;
  recordJump: (n: number, ms: number) => void;
  setDomNodes: (count: number | null) => void;
  exportJson: () => string;
};

const BenchContext = createContext<BenchApi | null>(null);

export function BenchProvider({
  appId,
  cache,
  children,
}: {
  appId: string;
  cache: CacheLabel;
  children: ReactNode;
}) {
  const start = useRef(performance.now());
  const painted = useRef(false);
  const [snapshot, setSnapshot] = useState<BenchSnapshot>({
    appId,
    cache,
    messageCount: 0,
    firstPaintMs: null,
    scrollFps: null,
    jumpN: null,
    jumpMs: null,
    domNodes: null,
    takenAt: Date.now(),
  });

  const setCache = useCallback((next: CacheLabel) => {
    setSnapshot((prev) => ({ ...prev, cache: next, takenAt: Date.now() }));
  }, []);

  const setMessageCount = useCallback((count: number) => {
    setSnapshot((prev) => ({ ...prev, messageCount: count, takenAt: Date.now() }));
  }, []);

  const markFirstPaint = useCallback(() => {
    if (painted.current) return;
    painted.current = true;
    const ms = performance.now() - start.current;
    setSnapshot((prev) => ({ ...prev, firstPaintMs: ms, takenAt: Date.now() }));
  }, []);

  const setScrollFps = useCallback((fps: number | null) => {
    setSnapshot((prev) => ({ ...prev, scrollFps: fps, takenAt: Date.now() }));
  }, []);

  const recordJump = useCallback((n: number, ms: number) => {
    setSnapshot((prev) => ({ ...prev, jumpN: n, jumpMs: ms, takenAt: Date.now() }));
  }, []);

  const setDomNodes = useCallback((count: number | null) => {
    setSnapshot((prev) => ({ ...prev, domNodes: count, takenAt: Date.now() }));
  }, []);

  const exportJson = useCallback(() => JSON.stringify(snapshot, null, 2), [snapshot]);

  const value = useMemo(
    () => ({
      snapshot,
      setCache,
      setMessageCount,
      markFirstPaint,
      setScrollFps,
      recordJump,
      setDomNodes,
      exportJson,
    }),
    [exportJson, markFirstPaint, recordJump, setCache, setDomNodes, setMessageCount, setScrollFps, snapshot],
  );

  return <BenchContext.Provider value={value}>{children}</BenchContext.Provider>;
}

export function useBench(): BenchApi {
  const ctx = useContext(BenchContext);
  if (!ctx) {
    throw new Error("useBench must be used under BenchProvider");
  }
  return ctx;
}
