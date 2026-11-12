import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { generation } from "@/db/schema";
import { startRender, VIDEO_PROVIDER } from "@/lib/ai/video";
import { getBalance, spend } from "@/lib/coins";
import { toDTO } from "@/lib/generations";
import { withGenerationGuard } from "@/lib/http";
import { COSTS } from "@/lib/pricing";

const Input = z.object({
  prompt: z.string().trim().min(3, "Describe the video in a few words").max(1000),
  aspect: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
  duration: z.union([z.literal(5), z.literal(10)]).default(5),
});

export async function POST(request: Request) {
  return withGenerationGuard(request, Input, async (user, input) => {
    const cost = COSTS.video * (input.duration / 5);
    const id = crypto.randomUUID();
    const { readyAt, willFail } = startRender("video");
    const [row] = await db
      .insert(generation)
      .values({
        id,
        userId: user.id,
        tool: "video",
        prompt: input.prompt,
        status: "processing",
        cost,
        provider: VIDEO_PROVIDER,
        readyAt,
        meta: { aspect: input.aspect, duration: input.duration, willFail },
      })
      .returning();
    try {
      await spend({ userId: user.id, amount: cost, jobId: id, description: `Video gen, ${input.duration}s` });
    } catch (err) {
      await db.delete(generation).where(eq(generation.id, id));
      throw err;
    }
    return NextResponse.json({ generation: toDTO(row), balance: await getBalance(user.id) }, { status: 202 });
  });
}
