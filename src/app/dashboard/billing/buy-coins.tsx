"use client";

import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { formatCoins, formatINR, type CoinPack } from "@/lib/pricing";
import { announceBalance, cn } from "@/lib/utils";

type Order =
  | { provider: "razorpay"; orderId: string; keyId: string; amount: number; currency: string; pack: { name: string; coins: number }; user: { name: string; email: string } }
  | { provider: "mock"; orderId: string; amount: number; pack: { name: string; coins: number } };

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayCtor = new (options: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };

function loadRazorpay(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error("Razorpay failed to load")));
    s.onerror = () => reject(new Error("Razorpay failed to load"));
    document.body.appendChild(s);
  });
}

export function BuyCoins({ packs, mode }: { packs: CoinPack[]; mode: "razorpay" | "mock" | "disabled" }) {
  const router = useRouter();
  const [selected, setSelected] = useState(packs.find((p) => p.popular)?.id ?? packs[0].id);
  const [busy, setBusy] = useState(false);
  const pack = packs.find((p) => p.id === selected)!;

  async function verify(body: Record<string, string>) {
    const res = await fetch("/api/billing/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Payment could not be verified");
    announceBalance(data.balance);
    toast.success(`Payment successful. +${formatCoins(data.coins)} coins`);
    router.refresh();
  }

  async function buy() {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ packId: selected }) });
      const order = (await res.json()) as Order & { error?: string };
      if (!res.ok) throw new Error(order.error ?? "Could not start checkout");

      if (order.provider === "mock") {
        await new Promise((r) => setTimeout(r, 900));
        await verify({ provider: "mock", orderId: order.orderId });
        return;
      }

      const Razorpay = await loadRazorpay();
      await new Promise<void>((resolve, reject) => {
        const rzp = new Razorpay({
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amount,
          currency: order.currency,
          name: "AI Studio",
          description: `${order.pack.name} pack: ${formatCoins(order.pack.coins)} coins`,
          prefill: { name: order.user.name, email: order.user.email },
          theme: { color: "#dc2626" },
          handler: (r: RazorpayResponse) => verify({ provider: "razorpay", ...r }).then(resolve, reject),
          modal: { ondismiss: () => resolve() },
        });
        rzp.on("payment.failed", () => reject(new Error("Payment failed. You were not charged.")));
        rzp.open();
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="packs-h" className="flex flex-col gap-4">
      <h2 id="packs-h" className="text-lg font-semibold">
        Buy coins
      </h2>
      <div role="radiogroup" aria-label="Coin packs" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {packs.map((p) => {
          const active = p.id === selected;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(p.id)}
              className={cn(
                "relative flex cursor-pointer flex-col items-start gap-2 rounded-2xl p-5 text-left transition-all",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active ? "border-brand shadow-lg shadow-brand-start/10" : "border border-border bg-card hover:bg-muted",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-semibold">{p.name}</span>
                {active ? <CheckCircle2 className="size-5 text-brand-start" /> : p.popular && <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-white">Popular</span>}
              </div>
              <span className="text-3xl font-semibold tracking-tight">{formatCoins(p.coins)}</span>
              <span className="-mt-2 text-sm text-muted-foreground">coins</span>
              <span className="text-lg font-semibold">{formatINR(p.pricePaise)}</span>
              <span className="text-sm text-success">{p.note}</span>
            </button>
          );
        })}
      </div>
      <Card className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-1">
          <span>
            Selected: <strong>{pack.name}</strong>, {formatCoins(pack.coins)} coins
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            {mode === "razorpay"
              ? "Secure checkout by Razorpay"
              : mode === "mock"
                ? "Demo checkout: no real payment. Add Razorpay test keys to use the real flow."
                : "Payments are not configured"}
          </span>
        </div>
        <Button variant="brand" size="lg" onClick={buy} disabled={busy || mode === "disabled"}>
          {busy && <Loader2 className="animate-spin" />}
          Pay {formatINR(pack.pricePaise)}
        </Button>
      </Card>
    </section>
  );
}
