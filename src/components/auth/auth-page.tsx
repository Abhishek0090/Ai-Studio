import { Suspense } from "react";
import { Logo } from "@/components/app/logo";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Card } from "@/components/ui/primitives";
import { isGoogleAuthEnabled } from "@/lib/auth";
import { AuthForm } from "./auth-form";

export function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  return (
    <main className="bg-brand-glow flex min-h-dvh flex-col px-4">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between py-5">
        <Logo />
        <ThemeToggle />
      </header>
      <div className="grid flex-1 place-items-center pb-16">
        <Card className="w-full max-w-md p-6 shadow-xl shadow-black/5 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">{mode === "sign-up" ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            {mode === "sign-up" ? "Start free. No card needed." : "Sign in to keep creating."}
          </p>
          <Suspense>
            <AuthForm mode={mode} googleEnabled={isGoogleAuthEnabled} />
          </Suspense>
        </Card>
      </div>
    </main>
  );
}
