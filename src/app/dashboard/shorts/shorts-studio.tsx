"use client";

import { Check, Copy, Loader2, Smartphone, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GenerationMedia } from "@/components/app/generation-card";
import { ShareButton } from "@/components/app/share-button";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, Label, Segmented } from "@/components/ui/primitives";
import { pollGeneration, postJson, type GenerationDTO } from "@/lib/client-api";
import { COSTS } from "@/lib/pricing";
import { cn, timeAgo } from "@/lib/utils";

type Script = {
  title: string;
  hook: string;
  scenes: { narration: string; visual: string; seconds: number }[];
  cta: string;
  hashtags: string[];
};

function parseScript(g: GenerationDTO): Script | null {
  try {
    return g.text ? (JSON.parse(g.text) as Script) : null;
  } catch {
    return null;
  }
}

function scriptToText(s: Script) {
  return [
    s.title,
    "",
    `HOOK: ${s.hook}`,
    "",
    ...s.scenes.map((sc, i) => `${i + 1}. (${sc.seconds}s) ${sc.narration}\n   Visual: ${sc.visual}`),
    "",
    `CTA: ${s.cta}`,
    "",
    s.hashtags.join(" "),
  ].join("\n");
}

function ShortView({ g, onChange }: { g: GenerationDTO; onChange: (g: GenerationDTO) => void }) {
  const script = parseScript(g);
  const [copied, setCopied] = useState(false);
  return (
    <Card className="grid gap-5 overflow-hidden p-4 sm:grid-cols-[220px_1fr] sm:p-5">
      <div className="mx-auto w-full max-w-[220px] overflow-hidden rounded-2xl border border-border">
        <GenerationMedia g={g} />
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">{script?.title ?? g.prompt}</h3>
            <p className="text-xs text-muted-foreground">{timeAgo(g.createdAt)}</p>
          </div>
          <Badge tone={g.status === "succeeded" ? "success" : g.status === "failed" ? "danger" : "muted"}>
            {g.status === "processing" ? "Rendering" : g.status === "succeeded" ? "Ready" : "Failed, refunded"}
          </Badge>
        </div>
        {script && (
          <>
            <div className="rounded-xl bg-brand p-[1px]">
              <div className="rounded-[11px] bg-card p-3">
                <div className="text-xs font-semibold tracking-wide text-brand-end uppercase">Hook</div>
                <p className="mt-1 text-sm font-medium">{script.hook}</p>
              </div>
            </div>
            <ol className="flex flex-col gap-2">
              {script.scenes.map((sc, i) => (
                <li key={i} className="flex gap-3 rounded-xl bg-muted p-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-card text-xs font-semibold">{i + 1}</span>
                  <div className="min-w-0">
                    <p>{sc.narration}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {sc.seconds}s. {sc.visual}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-sm">
              <span className="font-medium">CTA:</span> {script.cta}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {script.hashtags.map((h) => (
                <Badge key={h} tone="muted">
                  {h.startsWith("#") ? h : `#${h}`}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(scriptToText(script));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <Check /> : <Copy />} Copy script
              </Button>
              {g.status === "succeeded" && (
                <ShareButton id={g.id} isPublic={g.isPublic} title={script.title} onChange={(isPublic) => onChange({ ...g, isPublic })} />
              )}
            </div>
          </>
        )}
        {!script && g.error && <p className="text-sm text-danger">{g.error}</p>}
      </div>
    </Card>
  );
}

export function ShortsStudio({ history: initial }: { history: GenerationDTO[] }) {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<"energetic" | "educational" | "funny" | "calm" | "dramatic">("energetic");
  const [duration, setDuration] = useState<30 | 45 | 60>(30);
  const [language, setLanguage] = useState<"English" | "Hindi" | "Hinglish">("English");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState(initial);

  const processingIds = items.filter((g) => g.status === "processing").map((g) => g.id).join(",");
  useEffect(() => {
    if (!processingIds) return;
    const controller = new AbortController();
    for (const id of processingIds.split(",")) {
      pollGeneration(id, (g) => setItems((l) => l.map((x) => (x.id === g.id ? g : x))), controller.signal).then((g) => {
        if (g?.status === "succeeded") toast.success("Your short is ready");
        if (g?.status === "failed") toast.error("Render failed. Coins refunded.");
      });
    }
    return () => controller.abort();
  }, [processingIds]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const data = await postJson<{ generation: GenerationDTO }>("/api/generate/shorts", { topic, tone, duration, language });
    setLoading(false);
    if (data) {
      setItems((l) => [data.generation, ...l]);
      if (data.generation.status === "failed") toast.error(data.generation.error ?? "Script failed. Coins refunded.");
      else toast("Script ready. Rendering the video now.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5">
        <form onSubmit={generate} className="grid gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-2 lg:col-span-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              required
              minLength={3}
              maxLength={300}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="3 money habits every college student should start"
              className="h-12 text-base"
            />
          </div>
          <Segmented
            label="Tone"
            value={tone}
            onChange={setTone}
            options={[
              { value: "energetic", label: "Energetic" },
              { value: "educational", label: "Educational" },
              { value: "funny", label: "Funny" },
              { value: "calm", label: "Calm" },
              { value: "dramatic", label: "Dramatic" },
            ]}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Segmented
              label="Length"
              value={duration}
              onChange={setDuration}
              options={[
                { value: 30, label: "30s" },
                { value: 45, label: "45s" },
                { value: 60, label: "60s" },
              ]}
            />
            <Segmented
              label="Language"
              value={language}
              onChange={setLanguage}
              options={[
                { value: "English", label: "English" },
                { value: "Hindi", label: "Hindi" },
                { value: "Hinglish", label: "Hinglish" },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
            <Button variant="brand" size="lg" type="submit" disabled={loading || topic.trim().length < 3}>
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {loading ? "Writing script..." : `Create short for ${COSTS.shorts} coins`}
            </Button>
            <span className="text-xs text-muted-foreground">Script by Gemini (free tier). Video uses the demo renderer.</span>
          </div>
        </form>
      </Card>

      {items.length === 0 ? (
        <Card className="bg-brand-glow grid min-h-60 place-items-center p-10 text-center">
          <div className="flex flex-col items-center gap-2">
            <Smartphone className="size-7 text-brand-start" />
            <p className="font-medium">No shorts yet</p>
            <p className="text-sm text-muted-foreground">Enter a topic to get a full script and a vertical video.</p>
          </div>
        </Card>
      ) : (
        <div className={cn("flex flex-col gap-4")}>
          {items.map((g) => (
            <ShortView key={`${g.id}-${g.status}`} g={g} onChange={(n) => setItems((l) => l.map((x) => (x.id === n.id ? n : x)))} />
          ))}
        </div>
      )}
    </div>
  );
}
