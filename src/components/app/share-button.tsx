"use client";

import { Check, Link2, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Makes a creation public and shares its link: the native share sheet on
 * phones (and the installed PWA), clipboard everywhere else.
 */
export function ShareButton({
  id,
  isPublic,
  title,
  onChange,
  size = "sm",
}: {
  id: string;
  isPublic: boolean;
  title: string;
  onChange?: (isPublic: boolean) => void;
  size?: "sm" | "md";
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function share() {
    setBusy(true);
    try {
      if (!isPublic) {
        const res = await fetch(`/api/generations/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ isPublic: true }),
        });
        if (!res.ok) throw new Error();
        onChange?.(true);
      }
      const url = `${window.location.origin}/s/${id}`;
      if (navigator.share) {
        await navigator.share({ title: "Made with AI Studio", text: title, url }).catch(() => {});
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        toast.success("Share link copied");
      }
    } catch {
      toast.error("Could not create a share link");
    } finally {
      setBusy(false);
    }
  }

  async function unshare() {
    const res = await fetch(`/api/generations/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isPublic: false }),
    });
    if (res.ok) {
      onChange?.(false);
      toast.success("Link turned off. It is private again.");
    }
  }

  return (
    <div className="flex gap-1.5">
      <Button type="button" variant="outline" size={size} onClick={share} disabled={busy} className="min-w-0 flex-1 px-2">
        {copied ? <Check /> : <Share2 />} Share
      </Button>
      {isPublic && (
        <Button type="button" variant="ghost" size={size} onClick={unshare} aria-label="Make private" className="shrink-0 px-2.5" title="Public link is on. Click to turn it off.">
          <Link2 className="text-success" />
        </Button>
      )}
    </div>
  );
}
