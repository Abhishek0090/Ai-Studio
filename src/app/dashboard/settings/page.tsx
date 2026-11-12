import { CheckCircle2, CircleDashed } from "lucide-react";
import { ThemeSelect } from "@/components/app/theme-toggle";
import { InstallButton } from "@/components/pwa/install-button";
import { Card, PageHeader } from "@/components/ui/primitives";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { isCloudflareConfigured } from "@/lib/ai/image";
import { isRazorpayConfigured } from "@/lib/payments";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Settings" };

function Status({ live, label, detail }: { live: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 py-3">
      {live ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /> : <CircleDashed className="mt-0.5 size-5 shrink-0 text-muted-foreground" />}
      <div>
        <div className="font-medium">
          {label} <span className="text-sm font-normal text-muted-foreground">{live ? "Live" : "Demo mode"}</span>
        </div>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
    </li>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Settings" />

      <Card className="p-5">
        <h2 className="font-semibold">Profile</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-[120px_1fr]">
          <dt className="text-muted-foreground">Name</dt>
          <dd>{user.name}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="break-all">{user.email}</dd>
          <dt className="text-muted-foreground">Member since</dt>
          <dd>{new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</dd>
        </dl>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-semibold">Appearance</h2>
        <ThemeSelect />
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-semibold">App</h2>
        <p className="text-sm text-muted-foreground">Install AI Studio on your phone or computer for a full-screen, app-like experience.</p>
        <InstallButton className="w-fit px-5" />
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">AI providers</h2>
        <p className="mt-1 text-sm text-muted-foreground">Set keys in <code className="rounded bg-muted px-1">.env.local</code> to switch from demo to live.</p>
        <ul className="mt-2 divide-y divide-border">
          <Status live={isGeminiConfigured()} label="Gemini (code, shorts scripts)" detail="Free tier text models. Key: GEMINI_API_KEY" />
          <Status live={isCloudflareConfigured()} label="Cloudflare Workers AI (images)" detail="FLUX.1 schnell, 10,000 free Neurons a day. Keys: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN" />
          <Status live={false} label="Video renderer" detail="Simulated. No free video API exists; plug in fal.ai, Replicate or Veo later." />
          <Status live={isRazorpayConfigured()} label="Razorpay payments" detail="Test keys are free. Keys: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET" />
        </ul>
      </Card>
    </div>
  );
}
