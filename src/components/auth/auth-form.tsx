"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import { signIn, signUp } from "@/lib/auth-client";
import { FREE_TIER } from "@/lib/pricing";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

export function AuthForm({ mode, googleEnabled }: { mode: "sign-in" | "sign-up"; googleEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next")?.startsWith("/dashboard") ? params.get("next")! : "/dashboard";
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setLoading(true);
    const { error } =
      mode === "sign-up"
        ? await signUp.email({ email, password, name: String(form.get("name")) })
        : await signIn.email({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Something went wrong");
      return;
    }
    if (mode === "sign-up") toast.success(`Welcome! ${FREE_TIER.signupBonus} free coins added.`);
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {googleEnabled && (
        <>
          <Button variant="outline" size="lg" type="button" onClick={() => signIn.social({ provider: "google", callbackURL: next })}>
            <GoogleIcon /> Continue with Google
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {mode === "sign-up" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" autoComplete="name" required minLength={2} placeholder="Your name" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
        </div>
        <Button variant="brand" size="lg" type="submit" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          {mode === "sign-up" ? `Create account, get ${FREE_TIER.signupBonus} coins` : "Sign in"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {mode === "sign-up" ? "Already have an account? " : "New here? "}
        <Link href={mode === "sign-up" ? "/sign-in" : "/sign-up"} className="font-medium text-foreground underline-offset-4 hover:underline">
          {mode === "sign-up" ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
