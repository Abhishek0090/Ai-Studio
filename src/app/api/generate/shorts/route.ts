import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { generation } from "@/db/schema";
import { generateJson } from "@/lib/ai/gemini";
import { startRender, VIDEO_PROVIDER } from "@/lib/ai/video";
import { getBalance, spend } from "@/lib/coins";
import { failGeneration, toDTO } from "@/lib/generations";
import { withGenerationGuard } from "@/lib/http";
import { COSTS } from "@/lib/pricing";

const Input = z.object({
  topic: z.string().trim().min(3, "Give the short a topic").max(300),
  tone: z.enum(["energetic", "educational", "funny", "calm", "dramatic"]).default("energetic"),
  duration: z.union([z.literal(30), z.literal(45), z.literal(60)]).default(30),
  language: z.enum(["English", "Hindi", "Hinglish"]).default("English"),
});

export type ShortScript = {
  title: string;
  hook: string;
  scenes: { narration: string; visual: string; seconds: number }[];
  cta: string;
  hashtags: string[];
};

const SYSTEM = `You write scripts for vertical short videos (YouTube Shorts, Instagram Reels).
Return JSON only, matching: {"title": string, "hook": string, "scenes": [{"narration": string, "visual": string, "seconds": number}], "cta": string, "hashtags": string[]}.
The hook is the first line spoken and must grab attention in under 3 seconds.
Each scene has narration (spoken) and visual (what is on screen). Scene seconds add up to the requested duration.
Use 4 to 7 scenes and 5 to 8 hashtags without spaces.`;

function mockScript(topic: string, duration: number): ShortScript {
  const per = Math.round(duration / 5);
  return {
    title: `${topic}: explained in ${duration} seconds`,
    hook: `Most people get ${topic.toLowerCase()} completely wrong. Here's the truth.`,
    scenes: [
      { narration: `Let's talk about ${topic}.`, visual: "Bold title text over a fast zoom on the subject", seconds: per },
      { narration: "Here's the first thing nobody tells you.", visual: "Close-up b-roll with a big number 1 on screen", seconds: per },
      { narration: "Second, the small habit that changes everything.", visual: "Split screen: before and after", seconds: per },
      { narration: "And third, the mistake to avoid.", visual: "Red cross animation over the wrong approach", seconds: per },
      { narration: "Try this today and see the difference.", visual: "Creator to camera, smiling", seconds: duration - per * 4 },
    ],
    cta: "Follow for more in under a minute.",
    hashtags: ["#shorts", "#learn", "#tips", "#viral", "#howto"],
  };
}

export async function POST(request: Request) {
  return withGenerationGuard(request, Input, async (user, input) => {
    const id = crypto.randomUUID();
    const prompt = `${input.topic} (${input.tone}, ${input.duration}s, ${input.language})`;
    const [row] = await db
      .insert(generation)
      .values({
        id,
        userId: user.id,
        tool: "shorts",
        prompt,
        status: "processing",
        cost: COSTS.shorts,
        provider: VIDEO_PROVIDER,
        meta: { topic: input.topic, tone: input.tone, duration: input.duration, language: input.language },
      })
      .returning();
    try {
      await spend({ userId: user.id, amount: COSTS.shorts, jobId: id, description: "Shorts gen" });
    } catch (err) {
      await db.delete(generation).where(eq(generation.id, id));
      throw err;
    }

    let script: ShortScript;
    try {
      script = await generateJson<ShortScript>(
        SYSTEM,
        `Topic: ${input.topic}\nTone: ${input.tone}\nDuration: ${input.duration} seconds\nLanguage: ${input.language}`,
        () => mockScript(input.topic, input.duration),
      );
      if (!script?.scenes?.length) throw new Error("The script came back empty");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Script generation failed";
      await failGeneration(row, message);
      return NextResponse.json(
        { generation: toDTO({ ...row, status: "failed", error: message }), balance: await getBalance(user.id) },
        { status: 502 },
      );
    }

    // Script is ready; the video assembly runs as a background job.
    const { readyAt, willFail } = startRender("shorts");
    const [updated] = await db
      .update(generation)
      .set({ outputText: JSON.stringify(script), readyAt, meta: { ...row.meta, willFail }, updatedAt: new Date() })
      .where(eq(generation.id, id))
      .returning();

    return NextResponse.json({ generation: toDTO(updated), balance: await getBalance(user.id) }, { status: 202 });
  });
}
