import { Card, PageHeader } from "@/components/ui/primitives";
import { listTransactions } from "@/lib/coins";
import { isMockPaymentsAllowed, isRazorpayConfigured } from "@/lib/payments";
import { COIN_PACKS, COSTS, FREE_TIER, formatCoins } from "@/lib/pricing";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { BuyCoins } from "./buy-coins";

export const metadata = { title: "Billing and coins" };

const TYPE_STYLE = {
  purchase: "bg-success/12 text-success",
  bonus: "bg-coin-bg text-coin-fg",
  daily: "bg-coin-bg text-coin-fg",
  refund: "bg-sky-500/12 text-sky-700 dark:text-sky-400",
  spend: "bg-danger/12 text-danger",
} as const;

export default async function BillingPage() {
  const user = await requireUser();
  const txs = await listTransactions(user.id, 100);
  const mode = isRazorpayConfigured() ? "razorpay" : isMockPaymentsAllowed() ? "mock" : "disabled";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Billing and coins" description="Coins never expire. Pay with UPI, cards, netbanking or wallets." />

      <BuyCoins packs={COIN_PACKS} mode={mode} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit p-5">
          <h2 className="font-semibold">What things cost</h2>
          <dl className="mt-3 flex flex-col text-sm">
            {[
              ["Image", `${COSTS.image} coins`],
              ["Video, 5 seconds", `${COSTS.video} coins`],
              ["Short, up to 60 s", `${COSTS.shorts} coins`],
              ["Code gen message", `${COSTS.code} coin`],
              ["Daily free coins", `+${FREE_TIER.dailyCoins}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-border py-2.5 last:border-0">
                <dt>{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="min-w-0 p-5">
          <h2 className="font-semibold">Transactions</h2>
          {txs.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <th className="border-b border-border py-2 pr-3 font-semibold">Date</th>
                    <th className="border-b border-border py-2 pr-3 font-semibold">Description</th>
                    <th className="border-b border-border py-2 pr-3 font-semibold">Type</th>
                    <th className="border-b border-border py-2 text-right font-semibold">Coins</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((t) => (
                    <tr key={t.id}>
                      <td className="border-b border-border py-3 pr-3 whitespace-nowrap text-muted-foreground">
                        {t.createdAt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="border-b border-border py-3 pr-3">{t.description}</td>
                      <td className="border-b border-border py-3 pr-3">
                        <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold capitalize", TYPE_STYLE[t.type])}>{t.type}</span>
                      </td>
                      <td className={cn("border-b border-border py-3 text-right font-semibold", t.amount < 0 ? "text-danger" : "text-success")}>
                        {t.amount > 0 ? "+" : ""}
                        {formatCoins(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
