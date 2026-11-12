"use client";

import { Gift } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FREE_TIER } from "@/lib/pricing";
import { announceBalance } from "@/lib/utils";

export function DailyCoins({ claimed: initial }: { claimed: boolean }) {
  const router = useRouter();
  const [claimed, setClaimed] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function claim() {
    setBusy(true);
    const res = await fetch("/api/coins", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      announceBalance(data.balance);
      setClaimed(true);
      router.refresh();
      toast.success(`+${FREE_TIER.dailyCoins} free coins`);
    } else {
      if (res.status === 409) setClaimed(true);
      toast.error(data.error ?? "Could not claim coins");
    }
  }

  return (
    <Button variant={claimed ? "outline" : "brand"} onClick={claim} disabled={claimed || busy}>
      <Gift />
      {claimed ? "Daily coins claimed. Back tomorrow" : `Claim ${FREE_TIER.dailyCoins} free coins`}
    </Button>
  );
}
