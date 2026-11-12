import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { DailyCoins } from "@/components/app/daily-coins";
import { GenerationCard } from "@/components/app/generation-card";
import { TOOLS } from "@/components/app/nav";
import { Badge, Card } from "@/components/ui/primitives";
import { getBalance, hasClaimedToday, listTransactions, spentThisMonth } from "@/lib/coins";
import { listGenerations, toDTO } from "@/lib/generations";
import { formatCoins } from "@/lib/pricing";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardHome() {
  const user = await requireUser();
  const [balance, claimed, recent, spent, txs] = await Promise.all([
    getBalance(user.id),
    hasClaimedToday(user.id),
    listGenerations(user.id, { limit: 8 }),
    spentThisMonth(user.id),
    listTransactions(user.id, 5),
  ]);
  const firstName = user.name.split(" ")[0];
  const usedPct = balance + spent > 0 ? Math.round((spent / (balance + spent)) * 100) : 0;

  return (
    <div className="flex flex-col gap-8">
      <section className="bg-brand relative overflow-hidden rounded-3xl p-6 text-white sm:p-8">
        <div aria-hidden className="absolute -top-20 -right-20 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-2">
          <span className="inline-flex items-center gap-2 text-sm text-white/85">
            <Sparkles className="size-4" /> Welcome back
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Hi {firstName}, what will you create today?</h1>
          <p className="max-w-xl text-white/85">Pick a tool below. Every creation is saved to your library automatically.</p>
        </div>
      </section>

      <section aria-labelledby="tools-h" className="flex flex-col gap-4">
        <h2 id="tools-h" className="text-lg font-semibold">
          AI tools
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-start/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <div className="flex items-start justify-between">
                <span className={cn("grid size-11 place-items-center rounded-xl bg-gradient-to-br", t.tint)}>
                  <t.icon className="size-5" />
                </span>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <h3 className="mt-4 font-semibold">{t.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
              <Badge tone="coin" className="mt-4">
                {t.cost}
              </Badge>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section aria-labelledby="recent-h" className="flex min-w-0 flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <h2 id="recent-h" className="text-lg font-semibold">
              Recent creations
            </h2>
            <Link href="/dashboard/library" className="text-sm font-medium text-brand-start hover:underline">
              View library
            </Link>
          </div>
          {recent.length === 0 ? (
            <Card className="bg-brand-glow flex flex-col items-center gap-2 p-10 text-center">
              <Sparkles className="size-6 text-brand-start" />
              <p className="font-medium">Nothing here yet</p>
              <p className="text-sm text-muted-foreground">Your images, videos, shorts and code will show up here.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {recent.map((g) => (
                <GenerationCard key={g.id} g={toDTO(g)} compact />
              ))}
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4 p-5">
            <h2 className="font-semibold">Coin balance</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-tight">{formatCoins(balance)}</span>
              <span className="text-sm text-muted-foreground">coins left</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${usedPct}% of this month's coins used`}>
                <div className="h-full rounded-full bg-brand" style={{ width: `${usedPct}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{formatCoins(spent)} used this month</span>
            </div>
            <DailyCoins claimed={claimed} />
          </Card>
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Recent activity</h2>
              <Link href="/dashboard/billing" className="text-sm font-medium text-brand-start hover:underline">
                All
              </Link>
            </div>
            <ul className="flex flex-col gap-2.5 text-sm">
              {txs.map((t) => (
                <li key={t.id} className="flex justify-between gap-3">
                  <span className="truncate">{t.description}</span>
                  <span className={cn("shrink-0 font-semibold", t.amount < 0 ? "text-danger" : "text-success")}>
                    {t.amount > 0 ? "+" : ""}
                    {formatCoins(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
