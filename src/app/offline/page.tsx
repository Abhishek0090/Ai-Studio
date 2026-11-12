import { WifiOff } from "lucide-react";
import { LogoMark } from "@/components/app/logo";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="bg-brand-glow grid min-h-dvh place-items-center px-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-4">
        <LogoMark className="size-12" />
        <WifiOff className="size-8 text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-semibold">You are offline</h1>
        <p className="text-muted-foreground">
          AI Studio needs a connection to generate. Your coins and creations are safe. Reconnect and refresh.
        </p>
      </div>
    </main>
  );
}
