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
    <aside
      data-bench-hud=""
      className="border-border bg-card/80 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-2 font-mono text-[11px]"
    >
      <span className="text-muted-foreground uppercase tracking-wide">hud</span>
      <Badge variant={snapshot.cache === "cold" ? "destructive" : snapshot.cache === "warm" ? "default" : "outline"}>
        {snapshot.cache}
      </Badge>
      <dl className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="flex gap-1.5">
          <dt className="text-muted-foreground">messages</dt>
          <dd>{snapshot.messageCount}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted-foreground">first paint</dt>
          <dd>{fmt(snapshot.firstPaintMs, 0)} ms</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted-foreground">scroll fps</dt>
          <dd>{fmt(snapshot.scrollFps, 1)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted-foreground">jump n</dt>
          <dd>{snapshot.jumpN ?? "—"}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted-foreground">jump time</dt>
          <dd>{fmt(snapshot.jumpMs, 1)} ms</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted-foreground">dom nodes</dt>
          <dd>{snapshot.domNodes ?? "—"}</dd>
        </div>
      </dl>
      <div className="ml-auto flex gap-1">
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
