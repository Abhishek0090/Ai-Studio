"use client";

import { AlertTriangle, Code2, Download, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/primitives";
import type { GenerationDTO } from "@/lib/client-api";
import { cn, timeAgo } from "@/lib/utils";
import { ShareButton } from "./share-button";

const ASPECT_CLASS: Record<string, string> = {
  "1:1": "aspect-square",
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16]",
  "4:5": "aspect-[4/5]",
};

export function GenerationMedia({ g, className }: { g: GenerationDTO; className?: string }) {
  const aspect = (g.meta?.aspect as string) ?? (g.tool === "shorts" ? "9:16" : g.tool === "video" ? "16:9" : "1:1");
  const box = cn("relative w-full overflow-hidden bg-muted", ASPECT_CLASS[aspect] ?? "aspect-square", className);

  if (g.status === "processing") {
    return (
      <div className={cn(box, "animate-shimmer grid place-items-center")}>
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-brand-start" />
          {g.tool === "image" ? "Generating..." : "Rendering video..."}
        </div>
      </div>
    );
  }
  if (g.status === "failed") {
    return (
      <div className={cn(box, "grid place-items-center p-4 text-center")}>
        <div className="flex flex-col items-center gap-2 text-sm">
          <AlertTriangle className="size-6 text-danger" />
          <span className="font-medium">Failed</span>
          <span className="text-xs text-muted-foreground">{g.error ?? "Something went wrong"}. Coins refunded.</span>
        </div>
      </div>
    );
  }
  if (g.tool === "image" && g.url) {
    // eslint-disable-next-line @next/next/no-img-element -- user content served by our API
    return <img src={g.url} alt={g.prompt} className={cn(box, "object-cover")} loading="lazy" />;
  }
  if ((g.tool === "video" || g.tool === "shorts") && g.url) {
    return <video src={g.url} className={cn(box, "object-cover")} controls playsInline preload="metadata" aria-label={g.prompt} />;
  }
  if (g.tool === "code") {
    return (
      <div className={cn(box, "grid place-items-center")}>
        <Code2 className="size-8 text-brand-start" />
      </div>
    );
  }
  return <div className={box} />;
}

export function GenerationCard({
  g: initial,
  onDelete,
  compact,
}: {
  g: GenerationDTO;
  onDelete?: (id: string) => void;
  compact?: boolean;
}) {
  const [g, setG] = useState(initial);
  const [deleting, setDeleting] = useState(false);
  const ready = g.status === "succeeded";

  async function remove() {
    if (!confirm("Delete this creation? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/generations/${g.id}`, { method: "DELETE" });
    if (res.ok) {
      onDelete?.(g.id);
      toast.success("Deleted");
    } else {
      setDeleting(false);
      toast.error("Could not delete");
    }
  }

  return (
    <Card className="group overflow-hidden">
      <GenerationMedia g={g} className={compact ? "aspect-[4/3]" : undefined} />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm" title={g.prompt}>
            {g.tool === "code" ? (
              <Link href="/dashboard/code" className="hover:underline">
                {g.prompt}
              </Link>
            ) : (
              g.prompt
            )}
          </p>
          <Badge tone="coin" className="shrink-0">
            {g.cost}
          </Badge>
        </div>
        {!compact && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="capitalize">{g.tool}</span>
            <span>{timeAgo(g.createdAt)}</span>
          </div>
        )}
        {ready && g.tool !== "code" && !compact && (
          <div className="flex items-center gap-1.5">
            {g.url && (
              <Button asChild variant="outline" size="sm" className="min-w-0 flex-1 px-2">
                <a href={g.tool === "image" ? `${g.url}?download` : g.url} download target={g.tool === "image" ? undefined : "_blank"} rel="noreferrer">
                  <Download /> Save
                </a>
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <ShareButton id={g.id} isPublic={g.isPublic} title={g.prompt} onChange={(isPublic) => setG({ ...g, isPublic })} />
            </div>
            {onDelete && (
              <Button variant="ghost" size="sm" onClick={remove} disabled={deleting} aria-label="Delete" className="shrink-0 px-2.5">
                <Trash2 />
              </Button>
            )}
          </div>
        )}
        {!ready && onDelete && g.status === "failed" && !compact && (
          <Button variant="ghost" size="sm" onClick={remove} disabled={deleting}>
            <Trash2 /> Remove
          </Button>
        )}
      </div>
    </Card>
  );
}
