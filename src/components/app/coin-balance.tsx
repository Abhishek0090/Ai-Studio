"use client";

import { Coins } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCoins } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/** Live coin balance. Updates when any page announces a new balance. */
export function CoinBalance({ initial, className }: { initial: number; className?: string }) {
  const [balance, setBalance] = useState(initial);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = (e: Event) => {
      setBalance((e as CustomEvent<number>).detail);
      setPulse(true);
      clearTimeout(timer);
      timer = setTimeout(() => setPulse(false), 600);
    };
    window.addEventListener("coins:changed", onChange);
    return () => {
      window.removeEventListener("coins:changed", onChange);
      clearTimeout(timer);
    };
  }, []);

  return (
    <Link
      href="/dashboard/billing"
      aria-label={`${balance} coins. Open billing`}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full bg-coin-bg px-3.5 text-sm font-semibold text-coin-fg transition-transform",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        pulse && "scale-110",
        className,
      )}
    >
      <Coins className="size-4" aria-hidden />
      <span aria-live="polite">{formatCoins(balance)}</span>
    </Link>
  );
}
