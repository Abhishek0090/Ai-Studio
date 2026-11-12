import { ArrowRight, Coins, RotateCcw, ShieldCheck, Smartphone } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/app/logo";
import { TOOLS } from "@/components/app/nav";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { COIN_PACKS, FREE_TIER, formatCoins, formatINR } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="bg-brand-glow min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="brand">
            <Link href="/sign-up">Start free</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-24 px-4 pt-12 pb-24 sm:px-6 sm:pt-20">
        <section className="flex flex-col items-center gap-6 text-center">
          <span className="border-brand rounded-full px-4 py-1.5 text-xs font-medium sm:text-sm">
            {FREE_TIER.signupBonus} free coins on signup, plus {FREE_TIER.dailyCoins} every day
          </span>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Images, videos, shorts and code. <span className="text-brand">One studio.</span>
          </h1>
          <p className="max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
            Describe what you want and AI Studio makes it. No subscription: buy coins when you need them, and failed jobs are
            refunded automatically.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="brand" size="lg">
              <Link href="/sign-up">
                Create for free <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#pricing">See pricing</Link>
            </Button>
          </div>
        </section>

        <section aria-labelledby="tools-h" className="flex flex-col gap-8">
          <h2 id="tools-h" className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything you need to create
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((t) => (
              <Card key={t.href} className="flex flex-col gap-4 p-5">
                <span className={cn("grid size-11 place-items-center rounded-xl bg-gradient-to-br", t.tint)}>
                  <t.icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{t.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                </div>
                <span className="mt-auto text-xs font-medium text-coin-fg">{t.cost}</span>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Coins, title: "Pay per use", body: "Coins never expire. Top up with UPI, cards or netbanking." },
            { icon: RotateCcw, title: "Automatic refunds", body: "If a generation fails, the coins go straight back." },
            { icon: Smartphone, title: "Install as an app", body: "Add AI Studio to your home screen on Android, iOS or desktop." },
          ].map((f) => (
            <div key={f.title} className="flex gap-4 rounded-2xl p-2">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-white">
                <f.icon className="size-5" />
              </span>
              <div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            </div>
          ))}
        </section>

        <section id="pricing" aria-labelledby="pricing-h" className="flex scroll-mt-8 flex-col gap-8">
          <div className="text-center">
            <h2 id="pricing-h" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Simple coin packs
            </h2>
            <p className="mt-2 text-muted-foreground">Start with free coins. Buy more only when you need them.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COIN_PACKS.map((p) => (
              <Card key={p.id} className={cn("relative flex flex-col gap-3 p-6", p.popular && "border-brand shadow-lg shadow-brand-start/10")}>
                {p.popular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">Most popular</span>
                )}
                <h3 className="font-semibold">{p.name}</h3>
                <div className="text-4xl font-semibold tracking-tight">{formatCoins(p.coins)}</div>
                <div className="-mt-2 text-sm text-muted-foreground">coins</div>
                <div className="text-xl font-semibold">{formatINR(p.pricePaise)}</div>
                <div className="text-sm text-success">{p.note}</div>
              </Card>
            ))}
          </div>
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4" /> Payments by Razorpay. We never see your card details.
          </p>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        AI Studio. Built with Next.js.
      </footer>
    </div>
  );
}
