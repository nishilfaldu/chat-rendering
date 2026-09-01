"use client";

import { useEffect } from "react";
import { useBench } from "./use-bench.ts";

export function useScrollFps(scrollRef: { current: HTMLElement | null }): void {
  const { setScrollFps } = useBench();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
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

    el.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      window.clearTimeout(idle);
    };
  }, [scrollRef, setScrollFps]);
}

export function useDomNodeCount(rootRef: { current: HTMLElement | null }): void {
  const { setDomNodes } = useBench();

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const tick = () => {
      setDomNodes(el.querySelectorAll("*").length);
    };
    tick();
    const observer = new MutationObserver(tick);
    observer.observe(el, { childList: true, subtree: true });
    const id = window.setInterval(tick, 1000);
    return () => {
      observer.disconnect();
      window.clearInterval(id);
    };
  }, [rootRef, setDomNodes]);
}
