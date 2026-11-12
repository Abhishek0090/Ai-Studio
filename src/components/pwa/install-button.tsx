"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * "Install app" for Chromium (beforeinstallprompt) plus a hint for iOS
 * Safari, which has no install prompt API. Hidden once installed.
 */
export function InstallButton({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    // Read once from browser-only APIs after mount.
    queueMicrotask(() => {
      setInstalled(standalone);
      setIos(isIos);
    });

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!deferred && !ios)) return null;

  if (!deferred && ios) {
    return (
      <div className={cn("rounded-xl border border-border bg-muted p-3 text-xs leading-relaxed text-muted-foreground", className)}>
        <span className="font-medium text-foreground">Install the app:</span> tap <Share className="inline size-3.5" aria-label="Share" /> then
        &ldquo;Add to Home Screen&rdquo;.
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        if (!deferred) return;
        await deferred.prompt();
        await deferred.userChoice;
        setDeferred(null);
      }}
      className={cn(
        "border-brand flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-90",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      <Download className="size-4" /> Install app
    </button>
  );
}
