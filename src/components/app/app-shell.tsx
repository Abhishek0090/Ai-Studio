"use client";

import { LogOut, Menu, Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { InstallButton } from "../pwa/install-button";
import { CoinBalance } from "./coin-balance";
import { Logo } from "./logo";
import { NAV } from "./nav";
import { ThemeToggle } from "./theme-toggle";

type ShellUser = { name: string; email: string; image?: string | null };

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map((group, i) => (
        <div key={i} className="flex flex-col gap-1">
          {group.section && (
            <div className="px-3 pt-5 pb-1.5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {group.section}
            </div>
          )}
          {group.items.map((item) => {
            const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {active && <span aria-hidden className="absolute top-2 bottom-2 left-0 w-1 rounded-full bg-brand" />}
                <item.icon className={cn("size-4.5", active && "text-brand-start")} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function UserCard({ user }: { user: ShellUser }) {
  const router = useRouter();
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-white">{initials}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{user.name}</div>
        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
      </div>
      <button
        type="button"
        aria-label="Sign out"
        title="Sign out"
        onClick={async () => {
          await signOut();
          router.push("/");
          router.refresh();
        }}
        className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}

export function AppShell({ user, balance, children }: { user: ShellUser; balance: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onNavigate = (e: Event) => router.push((e as CustomEvent<string>).detail);
    window.addEventListener("app:navigate", onNavigate);
    return () => window.removeEventListener("app:navigate", onNavigate);
  }, [router]);

  const sidebar = (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between px-1 py-1">
        <Logo href="/dashboard" />
        <button
          type="button"
          className="grid size-10 cursor-pointer place-items-center rounded-xl hover:bg-muted lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <NavLinks onNavigate={() => setOpen(false)} />
      </div>
      <InstallButton />
      <UserCard user={user} />
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh border-r border-border bg-card/60 backdrop-blur lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[min(300px,85vw)] border-r border-border bg-card shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            className="grid size-10 cursor-pointer place-items-center rounded-xl border border-border bg-card lg:hidden"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <div className="flex-1" />
          <CoinBalance initial={balance} />
          <Button asChild variant="brand" size="sm" className="hidden h-10 sm:inline-flex">
            <Link href="/dashboard/billing">
              <Plus /> Buy coins
            </Link>
          </Button>
          <ThemeToggle />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
