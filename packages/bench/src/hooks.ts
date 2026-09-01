"use client";

import { useEffect, useLayoutEffect } from "react";
import { useBench } from "./use-bench.tsx";

export function useScrollFps(element: HTMLElement | null): void {
  const { setScrollFps } = useBench();

  useEffect(() => {
    if (!element) return;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    let scrolling = false;
    let idle: number | undefined;

    const loop = (now: number) => {
      frames += 1;
      const elapsed = now - last;
      if (elapsed >= 500) {
        if (scrolling) {
          setScrollFps((frames * 1000) / elapsed);
        }
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };

    const onScroll = () => {
      scrolling = true;
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        scrolling = false;
      }, 200);
    };

    element.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      element.removeEventListener("scroll", onScroll);
      window.clearTimeout(idle);
    };
  }, [element, setScrollFps]);
}

export function useDomNodeCount(element: HTMLElement | null): void {
  const { setDomNodes } = useBench();

  useEffect(() => {
    if (!element) return;
    const tick = () => {
      setDomNodes(element.querySelectorAll("*").length);
    };
    tick();
    const observer = new MutationObserver(tick);
    observer.observe(element, { childList: true, subtree: true });
    const id = window.setInterval(tick, 1000);
    return () => {
      observer.disconnect();
      window.clearInterval(id);
    };
  }, [element, setDomNodes]);
}

export function useBenchSession(input: {
  root: HTMLElement | null;
  scroll: HTMLElement | null;
  messageCount: number;
}): void {
  const { setMessageCount, markFirstPaint } = useBench();
  useScrollFps(input.scroll);
  useDomNodeCount(input.root);

  useEffect(() => {
    setMessageCount(input.messageCount);
  }, [input.messageCount, setMessageCount]);

  useLayoutEffect(() => {
    if (!input.root) return;
    markFirstPaint();
  }, [input.root, markFirstPaint]);
}

export async function timeJump(run: () => void | Promise<void>): Promise<number> {
  const start = performance.now();
  await run();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  return performance.now() - start;
}
