import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GenerationMedia } from "@/components/app/generation-card";
import { Logo } from "@/components/app/logo";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { getPublicGeneration, toDTO } from "@/lib/generations";

export async function generateMetadata({ params }: PageProps<"/s/[id]">): Promise<Metadata> {
  const { id } = await params;
  const g = await getPublicGeneration(id);
  if (!g) return { title: "Not found" };
  const title = `${g.prompt.slice(0, 60)} | Made with AI Studio`;
  return {
    title,
    description: g.prompt,
    openGraph: { title, description: g.prompt, images: g.tool === "image" ? [`/api/files/${g.id}`] : undefined },
  };
}

export default async function SharePage({ params }: PageProps<"/s/[id]">) {
  const { id } = await params;
  const row = await getPublicGeneration(id);
  if (!row) notFound();
  const g = toDTO(row);
  let script: { title?: string; hook?: string } | null = null;
  if (g.tool === "shorts" && g.text) {
    try {
      script = JSON.parse(g.text);
    } catch {}
  }

  return (
    <main className="bg-brand-glow min-h-dvh px-4">
      <header className="mx-auto flex max-w-4xl items-center justify-between py-5">
        <Logo />
        <ThemeToggle />
      </header>
      <div className="mx-auto flex max-w-2xl flex-col gap-6 pt-6 pb-16">
        <Card className="overflow-hidden">
          {g.tool === "code" ? (
            <pre className="max-h-[70vh] overflow-auto bg-[#0d1117] p-5 text-[13px] whitespace-pre-wrap text-[#e6edf3]">{g.text}</pre>
          ) : (
            <div className={g.tool === "shorts" ? "mx-auto max-w-xs" : undefined}>
              <GenerationMedia g={g} />
            </div>
          )}
          <div className="flex flex-col gap-1 p-5">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Prompt</p>
            <p>{script?.title ?? g.prompt}</p>
            {script?.hook && <p className="text-sm text-muted-foreground">{script.hook}</p>}
          </div>
        </Card>
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold">Made with AI Studio</p>
            <p className="text-sm text-muted-foreground">Create your own. Start with free coins.</p>
          </div>
          <Button asChild variant="brand">
            <Link href="/sign-up">Try it free</Link>
          </Button>
        </Card>
      </div>
    </main>
  );
}
