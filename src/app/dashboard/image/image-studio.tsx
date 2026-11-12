"use client";

import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { GenerationCard } from "@/components/app/generation-card";
import { Button } from "@/components/ui/button";
import { Card, Label, Segmented, Textarea } from "@/components/ui/primitives";
import { postJson, type GenerationDTO } from "@/lib/client-api";
import { COSTS } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const STYLES = [
  { value: "none", label: "None", swatch: "bg-muted" },
  { value: "photo", label: "Photo", swatch: "bg-gradient-to-br from-amber-200 to-sky-400" },
  { value: "anime", label: "Anime", swatch: "bg-gradient-to-br from-sky-300 to-rose-400" },
  { value: "3d", label: "3D render", swatch: "bg-gradient-to-br from-sky-300 to-indigo-500" },
  { value: "art", label: "Painting", swatch: "bg-gradient-to-br from-orange-300 to-rose-500" },
  { value: "logo", label: "Logo", swatch: "bg-gradient-to-br from-slate-100 to-slate-300" },
] as const;

const IDEAS = [
  "A cozy coffee shop on a rainy evening, warm window light",
  "Futuristic Mumbai skyline at sunset, flying cars",
  "Cute robot watering plants on a balcony",
  "Minimal logo of a fox made of geometric shapes",
];

type Aspect = "1:1" | "16:9" | "9:16" | "4:5";

export function ImageStudio({ history: initial }: { history: GenerationDTO[] }) {
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<Aspect>("1:1");
  const [style, setStyle] = useState<(typeof STYLES)[number]["value"]>("none");
  const [count, setCount] = useState<1 | 2 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<GenerationDTO[]>([]);
  const [history, setHistory] = useState(initial);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const now = Date.now();
    setPending(
      Array.from({ length: count }, (_, i) => ({
        id: `pending-${now}-${i}`,
        tool: "image",
        prompt,
        status: "processing",
        cost: COSTS.image,
        provider: "",
        url: null,
        text: null,
        error: null,
        isPublic: false,
        meta: { aspect },
        createdAt: now,
      })),
    );
    const data = await postJson<{ generations: GenerationDTO[] }>("/api/generate/image", { prompt, aspect, style, count });
    setPending([]);
    setLoading(false);
    if (data) setHistory((h) => [...data.generations, ...h]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="h-fit p-5 lg:sticky lg:top-24">
        <form onSubmit={generate} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              rows={5}
              required
              minLength={3}
              maxLength={1000}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A cozy coffee shop on a rainy evening, warm window light..."
            />
            <div className="flex flex-wrap gap-1.5">
              {IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => setPrompt(idea)}
                  className="cursor-pointer rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Wand2 className="mr-1 inline size-3" />
                  {idea.split(",")[0]}
                </button>
              ))}
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Style</legend>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={style === s.value}
                  onClick={() => setStyle(s.value)}
                  className={cn(
                    "cursor-pointer overflow-hidden rounded-xl border text-xs transition-all",
                    style === s.value ? "border-brand ring-2 ring-brand-start/30" : "border-border hover:bg-muted",
                  )}
                >
                  <span className={cn("block h-10", s.swatch)} />
                  <span className="block py-1.5">{s.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <Segmented
            label="Aspect ratio"
            value={aspect}
            onChange={setAspect}
            options={[
              { value: "1:1", label: "1:1" },
              { value: "16:9", label: "16:9" },
              { value: "9:16", label: "9:16" },
              { value: "4:5", label: "4:5" },
            ]}
          />
          <Segmented
            label="Number of images"
            value={count}
            onChange={setCount}
            options={[
              { value: 1, label: "1" },
              { value: 2, label: "2" },
              { value: 4, label: "4" },
            ]}
          />

          <Button variant="brand" size="lg" type="submit" disabled={loading || prompt.trim().length < 3}>
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Generate for {COSTS.image * count} coins
          </Button>
          <p className="-mt-2 text-center text-xs text-muted-foreground">Failed images are refunded automatically.</p>
        </form>
      </Card>

      <section aria-label="Results" className="flex min-w-0 flex-col gap-4">
        {pending.length === 0 && history.length === 0 ? (
          <Card className="bg-brand-glow grid min-h-80 place-items-center p-10 text-center">
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="size-7 text-brand-start" />
              <p className="font-medium">Your images will appear here</p>
              <p className="text-sm text-muted-foreground">Try one of the ideas on the left.</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pending.map((g) => (
              <GenerationCard key={g.id} g={g} />
            ))}
            {history.map((g) => (
              <GenerationCard key={g.id} g={g} onDelete={(id) => setHistory((h) => h.filter((x) => x.id !== id))} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
