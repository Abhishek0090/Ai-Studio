"use client";

import { Clapperboard, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GenerationCard } from "@/components/app/generation-card";
import { Button } from "@/components/ui/button";
import { Card, Label, Segmented, Textarea } from "@/components/ui/primitives";
import { pollGeneration, postJson, type GenerationDTO } from "@/lib/client-api";
import { COSTS } from "@/lib/pricing";

export function VideoStudio({ history: initial }: { history: GenerationDTO[] }) {
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [duration, setDuration] = useState<5 | 10>(5);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState(initial);

  const processingIds = items.filter((g) => g.status === "processing").map((g) => g.id).join(",");

  // Poll every job that is still rendering, including ones from earlier visits.
  useEffect(() => {
    if (!processingIds) return;
    const controller = new AbortController();
    for (const id of processingIds.split(",")) {
      pollGeneration(
        id,
        (g) => setItems((list) => list.map((x) => (x.id === g.id ? g : x))),
        controller.signal,
      ).then((g) => {
        if (!g) return;
        if (g.status === "succeeded") toast.success("Your video is ready");
        if (g.status === "failed") toast.error("Video failed. Coins refunded.");
      });
    }
    return () => controller.abort();
  }, [processingIds]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const data = await postJson<{ generation: GenerationDTO }>("/api/generate/video", { prompt, aspect, duration });
    setLoading(false);
    if (data) {
      setItems((list) => [data.generation, ...list]);
      toast("Rendering started. We'll update this page when it's done.");
    }
  }

  const cost = COSTS.video * (duration / 5);

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="h-fit p-5 lg:sticky lg:top-24">
        <form onSubmit={generate} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="vprompt">Scene</Label>
            <Textarea
              id="vprompt"
              rows={5}
              required
              minLength={3}
              maxLength={1000}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Drone shot over a misty tea plantation at sunrise, slow forward motion"
            />
          </div>
          <Segmented
            label="Aspect ratio"
            value={aspect}
            onChange={setAspect}
            options={[
              { value: "16:9", label: "16:9 Landscape" },
              { value: "9:16", label: "9:16 Vertical" },
              { value: "1:1", label: "1:1" },
            ]}
          />
          <Segmented
            label="Length"
            value={duration}
            onChange={setDuration}
            options={[
              { value: 5, label: "5 seconds" },
              { value: 10, label: "10 seconds" },
            ]}
          />
          <Button variant="brand" size="lg" type="submit" disabled={loading || prompt.trim().length < 3}>
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Generate for {cost} coins
          </Button>
          <p className="-mt-2 text-center text-xs text-muted-foreground">
            Demo renderer: returns a sample clip. Plug in a paid video API when you are ready.
          </p>
        </form>
      </Card>

      <section aria-label="Videos" className="min-w-0">
        {items.length === 0 ? (
          <Card className="bg-brand-glow grid min-h-80 place-items-center p-10 text-center">
            <div className="flex flex-col items-center gap-2">
              <Clapperboard className="size-7 text-brand-start" />
              <p className="font-medium">No videos yet</p>
              <p className="text-sm text-muted-foreground">Describe a scene to render your first clip.</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((g) => (
              <GenerationCard key={`${g.id}-${g.status}`} g={g} onDelete={(id) => setItems((l) => l.filter((x) => x.id !== id))} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
