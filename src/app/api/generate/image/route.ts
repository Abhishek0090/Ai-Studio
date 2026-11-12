import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { generation } from "@/db/schema";
import { generateImage, ASPECTS, STYLES, isCloudflareConfigured } from "@/lib/ai/image";
import { getBalance, InsufficientCoinsError, spend } from "@/lib/coins";
import { failGeneration, toDTO } from "@/lib/generations";
import { withGenerationGuard } from "@/lib/http";
import { COSTS } from "@/lib/pricing";
import { saveFile } from "@/lib/storage";

const Input = z.object({
  prompt: z.string().trim().min(3, "Describe the image in a few words").max(1000),
  aspect: z.enum(Object.keys(ASPECTS) as [keyof typeof ASPECTS]).default("1:1"),
  style: z.enum(Object.keys(STYLES) as [keyof typeof STYLES]).default("none"),
  count: z.union([z.literal(1), z.literal(2), z.literal(4)]).default(1),
});

export async function POST(request: Request) {
  return withGenerationGuard(request, Input, async (user, input) => {
    const total = COSTS.image * input.count;
    const balance = await getBalance(user.id);
    if (balance < total) throw new InsufficientCoinsError(total, balance);

    const provider = isCloudflareConfigured() ? "cloudflare-flux-schnell" : "mock";

    // Reserve coins one job at a time (SQLite allows one writer), then
    // generate the images in parallel.
    const rows: (typeof generation.$inferSelect)[] = [];
    for (let i = 0; i < input.count; i++) {
      const id = crypto.randomUUID();
      const [row] = await db
        .insert(generation)
        .values({
          id,
          userId: user.id,
          tool: "image",
          prompt: input.prompt,
          status: "processing",
          cost: COSTS.image,
          provider,
          meta: { aspect: input.aspect, style: input.style },
        })
        .returning();
      try {
        await spend({ userId: user.id, amount: COSTS.image, jobId: id, description: "Image gen" });
      } catch (err) {
        await db.delete(generation).where(eq(generation.id, id));
        if (rows.length === 0) throw err;
        break;
      }
      rows.push(row);
    }

    const results = await Promise.all(
      rows.map(async (row) => {
        const id = row.id;
        try {
          const img = await generateImage({
            prompt: input.prompt,
            aspect: input.aspect,
            style: input.style,
            seed: Math.floor(Math.random() * 1_000_000),
          });
          const file = await saveFile(`${id}.${img.ext}`, img.data);
          const [done] = await db
            .update(generation)
            .set({ status: "succeeded", output: file, provider: img.provider, updatedAt: new Date() })
            .where(eq(generation.id, id))
            .returning();
          return toDTO(done);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Generation failed";
          await failGeneration(row, message);
          return toDTO({ ...row, status: "failed", error: message });
        }
      }),
    );

    return NextResponse.json({ generations: results, balance: await getBalance(user.id) });
  });
}
