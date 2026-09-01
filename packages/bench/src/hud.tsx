"use client";

import type { ReactNode } from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { useBench } from "./use-bench.tsx";

function fmt(value: number | null, digits = 1): string {
  if (value === null) return "—";
  return value.toFixed(digits);
}

export function Hud(): ReactNode {
  const { snapshot, exportJson } = useBench();

  function copy() {
    void navigator.clipboard.writeText(exportJson());
  }

  function download() {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${snapshot.appId}-${snapshot.cache}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <aside className="pointer-events-auto absolute top-24 right-3 z-50 w-64 rounded-xl border border-border bg-card/95 p-3 font-mono text-[11px] shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="uppercase tracking-wide text-muted-foreground">hud</span>
        <Badge variant={snapshot.cache === "cold" ? "destructive" : snapshot.cache === "warm" ? "default" : "outline"}>
          {snapshot.cache}
        </Badge>
      </div>
      <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-foreground">
        <dt className="text-muted-foreground">messages</dt>
        <dd>{snapshot.messageCount}</dd>
        <dt className="text-muted-foreground">first paint</dt>
        <dd>{fmt(snapshot.firstPaintMs, 0)} ms</dd>
        <dt className="text-muted-foreground">scroll fps</dt>
        <dd>{fmt(snapshot.scrollFps, 1)}</dd>
        <dt className="text-muted-foreground">jump n</dt>
        <dd>{snapshot.jumpN ?? "—"}</dd>
        <dt className="text-muted-foreground">jump time</dt>
        <dd>{fmt(snapshot.jumpMs, 1)} ms</dd>
        <dt className="text-muted-foreground">dom nodes</dt>
        <dd>{snapshot.domNodes ?? "—"}</dd>
      </dl>
      <div className="mt-2 flex gap-1">
        <Button type="button" size="sm" variant="secondary" onClick={copy}>
          copy json
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={download}>
          export
        </Button>
      </div>
    </aside>
  );
}
